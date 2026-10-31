// Deterministic post-processing of VLM findings (TinyDamage lesson:
// never trust the VLM's structured output unchecked — validate it).
// Mirrors Tarpit59 Stage 4 spatial filtering + Felirent severity bands
// + PT cost-band capping.

import {
  costBand,
  damageTypesFor,
  isPlausible,
  partLabel,
  partsFor,
} from './taxonomy'
import type {
  AssetType,
  DamageFinding,
  ImageFindings,
  Region,
  RepairType,
  Severity,
  WaterSource,
} from './types'

const REGIONS = new Set<Region>([
  'upper-left', 'upper-center', 'upper-right',
  'middle-left', 'center', 'middle-right',
  'lower-left', 'lower-center', 'lower-right',
])

const REPAIR_TYPES = new Set<RepairType>([
  'polish', 'pdr', 'repair_paint', 'seal', 'clean', 'treat',
  'repair', 'replace', 'remediate', 'monitor', 'investigate',
])

const WATER_SOURCES = new Set<WaterSource>([
  'roof_leak', 'plumbing', 'rising_damp', 'condensation', 'penetrating', 'flood', 'unknown',
])

const SEVERITIES: Severity[] = ['minor', 'moderate', 'severe']

function clampSeverity(s: unknown): Severity {
  return SEVERITIES.includes(s as Severity) ? (s as Severity) : 'moderate'
}

/** Fuzzy-match a free-text location to the closest canonical part key. */
export function resolvePartKey(asset: AssetType, location: string | undefined, partKey: string | undefined): string | undefined {
  const parts = partsFor(asset)
  if (partKey && parts.some((p) => p.key === partKey)) return partKey
  if (!location) return partKey
  const norm = location.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  // exact label match
  for (const p of parts) {
    const label = p.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (norm === label || norm.includes(label) || label.includes(norm)) return p.key
  }
  // token overlap
  let best: { key: string; score: number } | undefined
  for (const p of parts) {
    const tokens = p.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[\s()/]+/)
    const score = tokens.filter((t) => t.length > 3 && norm.includes(t)).length
    if (score > (best?.score ?? 0)) best = { key: p.key, score }
  }
  return best?.key ?? partKey
}

// Severity normalisation vs the Felirent-style bands baked into the prompt.
// Cheap deterministic override when the model disagrees with its own size.
function normalizeSeverity(f: DamageFinding): Severity {
  const size = (f.sizeEstimate ?? '').toLowerCase()
  const cm = size.match(/(\d+(?:[.,]\d+)?)\s*[x×]?\s*(\d+(?:[.,]\d+)?)?\s*cm/)
  const m2 = size.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/)

  if (f.damageType === 'scratch' && cm) {
    const longest = Math.max(parseFloat(cm[1].replace(',', '.')), parseFloat(cm[2] ?? '0'.replace(',', '.')))
    if (longest < 2) return 'minor'
    if (longest <= 10) return f.severity === 'severe' ? 'moderate' : f.severity
    return f.severity === 'minor' ? 'moderate' : f.severity
  }
  if (f.damageType === 'dent' && cm) {
    const a = parseFloat(cm[1].replace(',', '.'))
    const b = parseFloat((cm[2] ?? cm[1]).replace(',', '.'))
    const area = a * b
    if (area <= 50) return 'minor' // ≤10×5
    if (area <= 1600) return f.severity === 'minor' ? 'moderate' : f.severity // ≤40×40
    return 'severe' // >40×40 → replace per matrix
  }
  if ((f.damageType === 'water_stain' || f.damageType === 'mold') && m2) {
    const area = parseFloat(m2[1].replace(',', '.'))
    if (area < 0.5) return 'minor'
    if (area < 3) return f.severity === 'minor' ? 'moderate' : f.severity
    return 'severe'
  }
  // hard-coded severity floor for always-serious types
  const hardSevere = ['airbag_deployed', 'fire_damage', 'crack_structural', 'roof_structure_damage', 'active_leak', 'sagging_ceiling', 'glass_shatter']
  if (hardSevere.includes(f.damageType)) return 'severe'
  return f.severity
}

// Default repairType when the model returns an implausible or missing one.
function defaultRepairType(asset: AssetType, f: DamageFinding): RepairType {
  const sev = f.severity
  if (asset === 'vehicle') {
    if (f.damageType === 'scratch' && sev === 'minor') return 'polish'
    if (f.damageType === 'dent' && sev === 'minor') return 'pdr'
    if (f.damageType === 'dent' && sev === 'moderate') return 'repair_paint'
    if (['glass_shatter', 'lamp_broken', 'broken_part', 'missing_part', 'wheel_damage'].includes(f.damageType)) return 'replace'
    if (f.damageType === 'dent' && sev === 'severe') return 'replace'
    if (f.damageType === 'corrosion') return 'treat'
    return sev === 'severe' ? 'replace' : 'repair_paint'
  }
  if (asset === 'property') {
    if (['water_stain', 'active_leak', 'damp_rising', 'damp_condensation', 'mold', 'efflorescence', 'flood_damage'].includes(f.damageType)) {
      return f.sourceHint && f.sourceHint !== 'unknown' ? 'remediate' : 'investigate'
    }
    if (f.damageType === 'mold' || f.damageType === 'corrosion' || f.damageType === 'rot') return 'treat'
    if (['missing_shingle', 'wind_crease', 'gutter_damage', 'flashing'].includes(f.damageType)) return 'repair'
    if (['crack_hairline', 'flaking_paint', 'peeling_wallpaper'].includes(f.damageType)) return 'repair_paint'
    if (['broken_glass', 'frame_damage', 'damaged_fixture', 'broken_tile'].includes(f.damageType)) return 'replace'
    if (f.damageType === 'crack_structural') return 'investigate'
    return sev === 'severe' ? 'replace' : 'repair'
  }
  return 'repair'
}

export interface ValidationResult {
  kept: DamageFinding[]
  dropped: { finding: DamageFinding; reason: string }[]
}

/**
 * Validate + normalize raw VLM findings for one image.
 * - resolve partKey/location to canonical taxonomy
 * - drop spatially impossible combos (Tarpit59 Stage 4)
 * - normalize severity vs size bands + hard floors
 * - clamp confidence, set repairType, cap cost vs PT bands
 */
export function validateFindings(asset: AssetType, raw: DamageFinding[]): ValidationResult {
  const kept: DamageFinding[] = []
  const dropped: ValidationResult['dropped'] = []

  for (const f of raw) {
    const notes: string[] = []
    const out: DamageFinding = { ...f, validationNotes: notes }

    // canonical damage key — keep unknown types but tag
    const dmgKnown = damageTypesFor(asset).some((d) => d.key === f.damageType)
    if (!dmgKnown) notes.push(`tipo '${f.damageType}' fora da taxonomia`)

    // resolve part
    out.partKey = resolvePartKey(asset, f.location, f.partKey)
    const canonical = out.partKey ? partLabel(asset, out.partKey) : undefined
    if (canonical && canonical !== f.location) {
      notes.push(`local normalizado: '${f.location}' → '${canonical}'`)
      out.location = canonical
    }

    // spatial plausibility
    if (out.partKey && dmgKnown && !isPlausible(asset, f.damageType, out.partKey)) {
      dropped.push({
        finding: f,
        reason: `combinação espacial impossível: '${f.damageType}' em '${canonical ?? out.partKey}'`,
      })
      continue
    }

    // severity
    const normalized = normalizeSeverity({ ...f, severity: clampSeverity(f.severity) })
    if (normalized !== f.severity) notes.push(`severidade ${f.severity} → ${normalized} (banda/tamanho)`)
    out.severity = normalized

    // confidence clamp
    out.confidence = Math.max(0, Math.min(1, Number(f.confidence) || 0.5))
    if (out.confidence < 0.4) notes.push('confiança baixa — verificar presencialmente')

    // region
    if (f.region && !REGIONS.has(f.region)) {
      delete out.region
    }

    // repairType
    if (!f.repairType || !REPAIR_TYPES.has(f.repairType)) {
      out.repairType = defaultRepairType(asset, { ...out, severity: normalized })
      notes.push(`repairType definido: ${out.repairType}`)
    }
    // repair-vs-replace rule: severe + replace-eligible type → upgrade repair→replace? no, keep model's but note
    if (out.severity === 'severe' && (out.repairType === 'polish' || out.repairType === 'pdr')) {
      out.repairType = 'repair_paint'
      notes.push('severo + polish/pdr impossível → repair_paint')
    }

    // water source hint validation
    if (f.sourceHint && !WATER_SOURCES.has(f.sourceHint)) {
      delete out.sourceHint
    }

    // cost band capping (PT market sanity)
    if (f.estCostEur && isFinite(f.estCostEur.min) && isFinite(f.estCostEur.max)) {
      const band = costBand(asset, out.repairType, normalized)
      let { min, max } = f.estCostEur
      if (min > max) [min, max] = [max, min]
      // Widen toward band rather than trusting wild guesses: clamp within 0.4×–2.5× of band
      const lo = Math.max(min, Math.round(band.min * 0.3))
      const hi = Math.min(max, Math.round(band.max * 2.5))
      const finalMin = Math.min(lo, Math.max(min, Math.round(band.min * 0.5)))
      const finalMax = Math.max(hi, Math.min(max, Math.round(band.max * 2)))
      if (Math.abs(finalMin - min) > 0 || Math.abs(finalMax - max) > 0) {
        out.estCostEur = { min: Math.max(0, finalMin), max: Math.max(finalMin, finalMax) }
        notes.push(`custo ajustado p/ banda PT €${band.min}–${band.max}`)
      }
    } else {
      const band = costBand(asset, out.repairType, normalized)
      out.estCostEur = { ...band }
      notes.push('custo estimado por banda (modelo não deu valor)')
    }

    if (notes.length) out.adjusted = true
    kept.push(out)
  }

  return { kept, dropped }
}

/** Normalize a whole per-image ImageFindings from raw VLM JSON. */
export function normalizeImageFindings(
  asset: AssetType,
  parsed: Partial<ImageFindings>,
  model: string,
): { findings: ImageFindings; dropped: ValidationResult['dropped'] } {
  const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : []
  const { kept, dropped } = validateFindings(asset, rawFindings)
  return {
    dropped,
    findings: {
      assetVisible: (parsed.assetVisible as ImageFindings['assetVisible']) ?? 'other',
      coverageView: parsed.coverageView,
      isRealPhoto: parsed.isRealPhoto !== false,
      photoConcern: parsed.photoConcern,
      imageQuality:
        parsed.imageQuality === 'poor' || parsed.imageQuality === 'usable' ? parsed.imageQuality : 'good',
      qualityIssues: Array.isArray(parsed.qualityIssues) ? parsed.qualityIssues : [],
      lookalikes: Array.isArray(parsed.lookalikes) ? parsed.lookalikes : [],
      findings: kept,
      summary: parsed.summary ?? '',
      analyzedAt: new Date().toISOString(),
      model,
    },
  }
}
