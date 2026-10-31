// Analysis pipeline orchestrator.
// per-image VLM findings → merge (multi-frame fusion) → fraud signals →
// consistency+report VLM call → deterministic triage → persisted analysis.

import { AI_VISION_MODEL, chat, extractJson } from './ai-vision'
import { damageTypeFor, detectDamage, labelPt, partFor, partProviders, regionFor, severityFor, sizeEstimateFor } from './damage-detect'
import { addAudit, db } from './db'
import { crossClaimDuplicates, fraudScore, fraudSignals } from './fraud'
import { prepareForVlm } from './prepare'
import { aggregatePrompt, damagePrompt } from './prompts'
import { readFile } from './storage'
import { COVERAGE_VIEWS, partLabel } from './taxonomy'
import { costRange, mergeFindings, overallSeverity, triageDecision } from './triage'
import type { Claim, ClaimAnalysis, ImageFindings, Severity } from './types'
import { normalizeImageFindings, validateFindings } from './validate'

const MAX_IMAGES = Number(process.env.ANALYSIS_MAX_IMAGES ?? 24)

// Concurrency: Ollama multimodal models do NOT support parallel requests safely
// (ollama#4165 — "failed processing images"; mllama is serial). Keep 1 for local
// CPU Ollama; raise AI_VISION_CONCURRENCY only for backends that handle parallel.
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.AI_VISION_CONCURRENCY ?? 1)))

const VLM_ENRICH = process.env.AI_VISION_ENRICH !== '0' // VLM optional; detector works alone

async function analyzeOne(claim: Claim, evidenceId: string): Promise<ImageFindings | null> {
  const item = claim.evidence.find((e) => e.id === evidenceId)
  if (!item || item.kind === 'video') return null
  const buf = await readFile(item.storageKey)
  if (!buf) return null
  const prepared = await prepareForVlm(buf)
  const contextParts = [claim.fnol.incidentType, claim.fnol.assetDescription].filter(Boolean)
  const prompt = damagePrompt(claim.fnol.assetType, contextParts.join(' — ') || undefined)

  // ── 1) Trained detector (CPU, ~1-2s) — grounded damage bboxes ──
  const det = await detectDamage(prepared.buffer, claim.fnol.assetType)

  // ── 2) VLM enrichment (optional — enriches description/quality/coverage) ──
  let vlmFindings: ImageFindings | null = null
  if (VLM_ENRICH) {
    try {
      const raw = await chat([prepared.buffer.toString('base64')], prompt, 180_000)
      const parsed = extractJson<Partial<ImageFindings>>(raw, {})
      const norm = normalizeImageFindings(claim.fnol.assetType, parsed, AI_VISION_MODEL)
      vlmFindings = norm.findings
      if (norm.dropped.length) {
        await db.updateClaim(claim.id, (c) => {
          addAudit(c, 'system', 'findings_filtered', norm.dropped.map((d) => d.reason).join('; '))
        })
      }
    } catch {
      vlmFindings = null // VLM down — detector alone still produces findings
    }
  }

  if (!det && !vlmFindings) return null // both unavailable

  // ── 3) Synthesize findings from detector boxes — then run through the SAME
  // deterministic validateFindings() as VLM output: spatial plausibility,
  // severity normalization, repairType defaults, PT cost bands.
  const providers = det ? partProviders({ parts: det.parts, damage: det.damage }) : []
  const asset = claim.fnol.assetType
  const usableDamage = (det?.damage ?? []).filter(
    // morph-scratch is a low-confidence CV fallback — drop micro-marks (<1% image)
    (d) => !(d.model === 'morph-scratch' && d.nw * d.nh < 0.003),
  )
  const rawDetFindings: ImageFindings['findings'] = usableDamage.map((d) => {
    const partKey = partFor(d, providers)
    const locPt = (partKey && partLabel(asset, partKey)) || regionFor(d).replace('-', ' ')
    return {
      damageType: damageTypeFor(d.label, asset) as ImageFindings['findings'][number]['damageType'],
      partKey,
      location: locPt,
      region: regionFor(d),
      severity: severityFor(d),
      confidence: Math.min(0.95, d.conf),
      sizeEstimate: sizeEstimateFor(d, providers, partKey),
      description: `${labelPt(d.label)} detetado (${d.model})`,
      repairAction: undefined,
      estCostEur: undefined,
      adjusted: false,
      validationNotes: [`detector:${d.model}`],
      bbox: { nx: d.nx, ny: d.ny, nw: d.nw, nh: d.nh },
      polygon: d.polygon,
    }
  })

  const { kept: detFindings } = validateFindings(claim.fnol.assetType, rawDetFindings)

  // ── 4) Inference heuristic: severe frontal damage but NO headlight detection
  // → headlight is likely missing/smashed beyond detection. Flag for review.
  if (claim.fnol.assetType === 'vehicle' && det && det.damage.length > 0) {
    const frontalParts = new Set(['bumper_f', 'fender_fl', 'fender_fr', 'hood', 'headlight_l', 'headlight_r'])
    const frontalHits = det.damage.filter((d) => {
      const pk = partFor(d, providers)
      return pk && frontalParts.has(pk)
    })
    const hasLampFinding = detFindings.some((f) => f.damageType === 'lamp_broken')
    if (frontalHits.length >= 2 && !hasLampFinding) {
      detFindings.push({
        damageType: 'lamp_broken',
        partKey: 'headlight_l',
        location: 'óptica frontal',
        severity: 'moderate',
        confidence: 0.35,
        description: 'Óptica provavelmente partida/em falta — dano frontal severo sem óptica detetada',
        repairType: 'replace',
        adjusted: false,
        validationNotes: ['inferred: frontal crash sem deteção de óptica — confirmar visualmente'],
      })
    }
  }
  // Preserve bbox on validated findings (validateFindings strips unknown fields)
  for (let i = 0; i < detFindings.length; i++) {
    const src = rawDetFindings.find(
      (r) => r.damageType === detFindings[i].damageType && r.partKey === detFindings[i].partKey,
    )
    if (src?.bbox && !detFindings[i].bbox) {
      detFindings[i] = { ...detFindings[i], bbox: src.bbox, polygon: src.polygon }
    }
  }

  // Merge: VLM findings (rich descriptions) + detector findings (grounded boxes).
  // Dedupe by damageType+partKey/region — detector wins on bbox; VLM wins on description.
  const mergedMap = new Map<string, ImageFindings['findings'][number]>()
  for (const f of [...(vlmFindings?.findings ?? []), ...detFindings]) {
    const key = `${f.damageType}|${f.partKey ?? f.region ?? f.location}`
    const prev = mergedMap.get(key)
    if (!prev || (f.bbox && !prev.bbox) || f.confidence > prev.confidence) {
      mergedMap.set(key, { ...prev, ...f, bbox: f.bbox ?? prev?.bbox, validationNotes: [...(prev?.validationNotes ?? []), ...(f.validationNotes ?? [])] })
    }
  }

  const parts = (det?.parts ?? []).map((p) => p.label).slice(0, 6)
  return {
    assetVisible: vlmFindings?.assetVisible ?? (det?.detections.length ? claim.fnol.assetType : 'none'),
    coverageView: vlmFindings?.coverageView,
    isRealPhoto: vlmFindings?.isRealPhoto ?? true,
    photoConcern: vlmFindings?.photoConcern,
    imageQuality: vlmFindings?.imageQuality ?? 'good',
    qualityIssues: vlmFindings?.qualityIssues ?? [],
    lookalikes: vlmFindings?.lookalikes,
    summary:
      vlmFindings?.summary ??
      (det?.damage.length
        ? `${det.damage.length} dano(s) detetado(s): ${[...new Set(det.damage.map((d) => d.label))].join(', ')}` +
          (parts.length ? ` · peças: ${parts.join(', ')}` : '')
        : det
          ? `sem danos detetados${parts.length ? ` (peças visíveis: ${parts.join(', ')})` : ''}`
          : 'sem análise'),
    findings: [...mergedMap.values()],
    analyzedAt: new Date().toISOString(),
    model: det ? `cardd-yolo11m${vlmFindings ? `+${AI_VISION_MODEL}` : ''}` : AI_VISION_MODEL,
  }
}

export async function runAnalysis(claimId: string, force = false): Promise<ClaimAnalysis | null> {
  const claim = await db.getClaim(claimId)
  if (!claim) return null

  const analyzable = claim.evidence
    .filter((e) => e.kind === 'photo' || e.kind === 'frame')
    .slice(0, MAX_IMAGES)
  if (analyzable.length === 0) return null

  // Cache: images already analyzed (previous run, or unchanged evidence) are
  // reused unless force=1 — re-analysis on CPU is expensive, don't redo work.
  const pending = force
    ? analyzable
    : analyzable.filter((e) => !e.findings)
  const cached = analyzable.length - pending.length

  await db.updateClaim(claimId, (c) => {
    c.status = 'analyzing'
    c.analysis = {
      ...(c.analysis ?? { model: AI_VISION_MODEL, imagesAnalyzed: 0, aggregatedFindings: [], overallSeverity: 'none' as const, estCostEur: { min: 0, max: 0 }, fraudSignals: [], fraudScore: 0, triage: { verdict: 'manual_review' as const, reasons: [], recommendedAction: '' }, reportText: '' }),
      startedAt: c.analysis?.startedAt ?? new Date().toISOString(),
      progress: { done: 0, total: pending.length, phase: 'images' },
    }
    addAudit(c, 'system', 'analysis_started', `${pending.length} a analisar (${cached} em cache)`)
  })

  // 1) Per-image analysis — small pool (default serial: safe for local Ollama)
  const perImageSummaries: string[] = []
  const coverageSeen = new Set<string>()
  let poorCount = 0
  let done = 0

  const recordFindings = async (item: (typeof pending)[number], findings: ImageFindings | null, err?: string) => {
    done++
    if (findings) {
      perImageSummaries.push(
        `[${item.fileName}${item.frameTimeSec != null ? ` @${item.frameTimeSec}s` : ''}${findings.coverageView ? ` ${findings.coverageView}` : ''}] ${findings.summary || 'sem resumo'}`,
      )
      if (findings.coverageView && findings.coverageView !== 'outro') coverageSeen.add(findings.coverageView)
      if (findings.imageQuality === 'poor') poorCount++
    }
    await db.updateClaim(claimId, (c) => {
      const ev = c.evidence.find((e) => e.id === item.id)
      if (ev) {
        if (findings) {
          ev.findings = findings
          delete ev.analysisError
        } else if (err) {
          ev.analysisError = err
        }
      }
      if (c.analysis?.progress) {
        c.analysis.progress.done = done
        c.analysis.progress.current = item.fileName
      }
    })
  }

  // Seed summaries for cached images too (they still count for coverage/merge)
  const freshPre = (await db.getClaim(claimId))!
  for (const item of analyzable) {
    if (pending.includes(item)) continue
    const f = item.findings ?? freshPre.evidence.find((e) => e.id === item.id)?.findings
    if (f) {
      perImageSummaries.push(
        `[${item.fileName} (cache)] ${f.summary || 'sem resumo'}`,
      )
      if (f.coverageView && f.coverageView !== 'outro') coverageSeen.add(f.coverageView)
      if (f.imageQuality === 'poor') poorCount++
    }
  }

  // Minimal async pool — keeps code simple and safe for serial backends
  const queue = [...pending]
  const worker = async () => {
    for (;;) {
      const item = queue.shift()
      if (!item) return
      try {
        const findings = await analyzeOne(claim, item.id)
        await recordFindings(item, findings)
      } catch (err) {
        await recordFindings(item, null, err instanceof Error ? err.message : String(err))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker))

  // 1b) Aggregate phase marker
  await db.updateClaim(claimId, (c) => {
    if (c.analysis?.progress) c.analysis.progress = { done, total: pending.length, phase: 'aggregate' }
  })

  // Reload to get persisted findings
  const fresh = (await db.getClaim(claimId))!
  const analyzed = fresh.evidence.filter((e) => e.findings)
  const perImage = analyzed.map((e) => e.findings!.findings)
  const merged = mergeFindings(fresh.fnol.assetType, perImage)
  const preExistingCount = merged.filter((f) => f.preExisting).length

  // 2) Fraud signals (deterministic + VLM authenticity)
  const signals = fraudSignals(fresh)
  const hashes = fresh.evidence.filter((e) => e.kind !== 'video').map((e) => e.sha256)
  signals.push(...(await crossClaimDuplicates(fresh.id, hashes)))
  const fScore = fraudScore(signals)

  // 3) Aggregation call — consistency verifier + report draft
  let consistency: ClaimAnalysis['consistencyCheck']
  let reportText = ''
  let llmSeverity: Severity | 'none' | undefined
  try {
    const raw = await chat(
      [],
      aggregatePrompt({
        asset: fresh.fnol.assetType,
        assetDescription: fresh.fnol.assetDescription,
        incidentType: fresh.fnol.incidentType,
        incidentDate: fresh.fnol.incidentDate,
        narrative: fresh.fnol.narrative,
        perImageSummaries,
        coverageViewsSeen: [...coverageSeen],
        expectedViews: COVERAGE_VIEWS[fresh.fnol.assetType],
        mergedFindings: JSON.stringify(merged),
        preExistingCount,
      }),
      120_000,
    )
    const parsed = extractJson<{
      consistencyCheck?: { consistent: boolean; notes: string }
      overallSeverity?: Severity | 'none'
      reportText?: string
    }>(raw, {})
    consistency = parsed.consistencyCheck
    reportText = parsed.reportText ?? ''
    llmSeverity = parsed.overallSeverity
    if (consistency && consistency.consistent === false) {
      signals.push({
        code: 'narrative_inconsistency',
        weight: 0.3,
        detail: consistency.notes || 'Danos não correspondem à narrativa',
      })
    }
  } catch (err) {
    reportText = `Agregação IA indisponível (${err instanceof Error ? err.message : 'erro'}). Revisar achados individualmente.`
  }

  const severity = overallSeverity(merged) !== 'none' ? overallSeverity(merged) : llmSeverity ?? 'none'
  const estCost = costRange(merged)
  const finalFraud = fraudScore(signals) // recompute with inconsistency
  const expectedViews = COVERAGE_VIEWS[fresh.fnol.assetType]
  const missingViews = expectedViews.filter((v) => !coverageSeen.has(v)).length
  const triage = triageDecision({
    severity,
    estCost,
    fraudScore: finalFraud,
    fraudSignals: signals,
    consistent: consistency?.consistent,
    imagesAnalyzed: analyzed.length,
    poorImages: poorCount,
    missingViews,
    preExistingCount,
    hasInjuries: fresh.fnol.injuries === true,
  })

  const analysis: ClaimAnalysis = {
    startedAt: fresh.analysis?.startedAt ?? new Date().toISOString(),
    coverageViews: [...coverageSeen],
    preExistingCount,
    progress: { done, total: pending.length, phase: 'done' },
    completedAt: new Date().toISOString(),
    model: AI_VISION_MODEL,
    imagesAnalyzed: analyzed.length,
    aggregatedFindings: merged,
    overallSeverity: severity,
    estCostEur: estCost,
    consistencyCheck: consistency,
    fraudSignals: signals,
    fraudScore: finalFraud || fScore,
    triage,
    reportText,
  }

  await db.updateClaim(claimId, (c) => {
    c.analysis = analysis
    c.status = 'analyzed'
    addAudit(
      c,
      'ai',
      'analysis_completed',
      `${analyzed.length} imagens, ${merged.length} achados, risco ${(analysis.fraudScore * 100).toFixed(0)}%, triage ${triage.verdict}`,
    )
  })

  return analysis
}
