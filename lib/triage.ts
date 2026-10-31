// Deterministic triage rules (FADES-style): auditable, rule-based.
// AI recommends; the adjuster always decides.

import type { AssetType, ClaimAnalysis, DamageFinding, FraudSignal, Severity, TriageVerdict } from './types'

const SEV_RANK: Record<Severity | 'none', number> = { none: 0, minor: 1, moderate: 2, severe: 3 }

export function mergeFindings(assetType: AssetType, perImage: DamageFinding[][]): DamageFinding[] {
  // Merge duplicates across photos/frames. Prefer canonical partKey
  // (post-validation) so the same panel seen in N frames merges cleanly;
  // fall back to normalized location text (multi-frame fusion, AAAI).
  const key = (f: DamageFinding) =>
    `${f.damageType}::${
      f.partKey ?? f.location.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    }`
  const best = new Map<string, DamageFinding>()
  for (const list of perImage) {
    for (const f of list) {
      const k = key(f)
      const cur = best.get(k)
      if (!cur) {
        best.set(k, f)
        continue
      }
      const fRank = SEV_RANK[f.severity]
      const cRank = SEV_RANK[cur.severity]
      const better =
        fRank > cRank || (fRank === cRank && f.confidence > cur.confidence)
      if (better) best.set(k, f)
      // Widen cost range when the same damage appears in multiple images
      if (f.estCostEur && cur.estCostEur) {
        cur.estCostEur = {
          min: Math.min(cur.estCostEur.min, f.estCostEur.min),
          max: Math.max(cur.estCostEur.max, f.estCostEur.max),
        }
      }
    }
  }
  return [...best.values()].sort(
    (a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.confidence - a.confidence,
  )
}

export function overallSeverity(findings: DamageFinding[]): Severity | 'none' {
  let max: Severity | 'none' = 'none'
  for (const f of findings) if (SEV_RANK[f.severity] > SEV_RANK[max]) max = f.severity
  return max
}

export function costRange(findings: DamageFinding[]): { min: number; max: number } {
  let min = 0
  let max = 0
  for (const f of findings) {
    if (f.estCostEur) {
      min += f.estCostEur.min
      max += f.estCostEur.max
    }
  }
  return { min: Math.round(min), max: Math.round(max) }
}

export interface TriageInput {
  severity: Severity | 'none'
  estCost: { min: number; max: number }
  fraudScore: number
  fraudSignals: FraudSignal[]
  consistent: boolean | undefined
  imagesAnalyzed: number
  poorImages: number
  missingViews?: number // shot-list views not covered by evidence
  preExistingCount?: number // findings flagged as likely pre-existing
  hasInjuries?: boolean    // FNOL injury signal — always forces human handling
}

export function triageDecision(input: TriageInput): ClaimAnalysis['triage'] {
  const reasons: string[] = []
  const {
    severity,
    estCost,
    fraudScore,
    fraudSignals,
    consistent,
    imagesAnalyzed,
    poorImages,
    missingViews = 0,
    preExistingCount = 0,
    hasInjuries = false,
  } = input

  // 1b) Injury signal — always human handling (indemnity path + urgency)
  if (hasInjuries) {
    return {
      verdict: 'manual_review',
      reasons: ['Lesões/feridos reportados no FNOL — tratamento prioritário por perito'],
      recommendedAction:
        'Contactar o segurado com urgência (preferência de contacto no FNOL). Verificar responsabilidade civil corporal e encaminhar para peritagem médica se aplicável.',
    }
  }

  // 1) SIU investigate — strong fraud signal or hard inconsistency
  const hardFlags = fraudSignals.filter((s) => s.weight >= 0.35)
  if (fraudScore >= 0.55 || hardFlags.length >= 2) {
    reasons.push(`Score de risco de fraude ${(fraudScore * 100).toFixed(0)}%`)
    for (const s of hardFlags) reasons.push(s.detail)
    return {
      verdict: 'siu_investigate',
      reasons,
      recommendedAction:
        'Encaminhar à Unidade de Sinistros Especiais (SIU). Não comunicar motivos ao segurado. Solicitar originais do telemóvel e preservar metadados.',
    }
  }

  // 2) Manual review — the default whenever anything is non-trivial
  if (severity === 'severe') reasons.push('Danos classificados como severos')
  if (estCost.max > 5000) reasons.push(`Estimativa de custo elevada (até €${estCost.max})`)
  if (consistent === false) reasons.push('Inconsistência entre narrativa e evidência visual')
  if (fraudScore >= 0.3) reasons.push(`Sinais de risco moderados (${(fraudScore * 100).toFixed(0)}%)`)
  if (imagesAnalyzed === 0) reasons.push('Sem evidência analisável')
  else if (poorImages / imagesAnalyzed > 0.5) reasons.push('Mais de metade da evidência com má qualidade')
  if (missingViews >= 3) reasons.push(`Cobertura incompleta — ${missingViews} vistas do checklist em falta`)
  if (preExistingCount >= 2) reasons.push(`${preExistingCount} achados com sinais de dano pré-existente`)

  const needsReview =
    severity === 'severe' ||
    estCost.max > 5000 ||
    consistent === false ||
    fraudScore >= 0.3 ||
    imagesAnalyzed === 0 ||
    poorImages / Math.max(1, imagesAnalyzed) > 0.5 ||
    missingViews >= 3 ||
    preExistingCount >= 2

  if (needsReview) {
    return {
      verdict: 'manual_review',
      reasons: reasons.length ? reasons : ['Revisão padrão por perito'],
      recommendedAction:
        'Atribuir a perito. Verificar pontos assinalados pela IA e, se necessário, agendar peritagem presencial ou videochamada.',
    }
  }

  // 3) STP eligible — low severity, low cost, consistent, clean
  reasons.push('Danos menores/moderados, custo estimado contido, narrativa coerente, sem sinais de fraude')
  return {
    verdict: 'stp_eligible',
    reasons,
    recommendedAction:
      'Elegível para processamento direto (STP). O perito pode aprovar com um clique após validação visual das fotos.',
  }
}
