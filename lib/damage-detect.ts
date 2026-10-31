// damage-detect client — CPU YOLO microservice (services/damage-detect).
// Trained CarDD model (vehicle) + YOLO-World open-vocab (parts/property).
// Returns grounded bboxes the VLM alone cannot produce.

const DAMAGE_DETECT_URL = process.env.DAMAGE_DETECT_URL ?? 'http://127.0.0.1:8110'
const DAMAGE_DETECT_TOKEN = process.env.DAMAGE_DETECT_TOKEN

export interface Detection {
  label: string
  kind: 'damage' | 'part'
  conf: number
  x: number; y: number; w: number; h: number     // pixels (original image)
  nx: number; ny: number; nw: number; nh: number // normalized 0..1 (UI overlay)
  polygon?: [number, number][]                   // segmentation contour (seg models)
  model: string
}

interface DetectResponse {
  detections: Detection[]
  damage: Detection[]
  parts: Detection[]
  ms: number
}

/** label → canonical taxonomy damageType (must exist in taxonomy.ts DAMAGE_TYPES) */
const LABEL_TO_TYPE: Record<string, string> = {
  // ① CarDD YOLOv8s-seg (6 classes) — vehicle canonical keys
  dent: 'dent',
  scratch: 'scratch',
  crack: 'crack',
  glass_shatter: 'glass_shatter',
  lamp_broken: 'lamp_broken',
  tire_flat: 'tire_flat',

  // ② YOLOv11n 14-class part+damage
  'Front-windscreen-damage': 'glass_shatter',
  'Headlight-damage':        'lamp_broken',
  'Rear-windscreen-Damage':  'glass_shatter',
  'Runningboard-Damage':     'dent',
  'Sidemirror-Damage':       'broken_part',
  'Taillight-Damage':        'lamp_broken',
  'bonnet-dent':             'dent',
  'boot-dent':               'dent',
  'doorouter-dent':          'dent',
  'fender-dent':             'dent',
  'front-bumper-dent':       'dent',
  'quaterpanel-dent':        'dent',
  'rear-bumper-dent':        'dent',
  'roof-dent':               'dent',

  // ③ Crack-seg / ④ Crack-joint — property canonical keys
  // (vehicle uses 'crack'; for property these feed 'crack_structural' via damageTypeFor(asset))
  joint: 'other',   // drywall joint — not real damage

  // Property phrases (yolo-world, kept for property profile)
  'structural_crack': 'crack_structural',
  'water_damage':     'water_stain',
  mold:               'mold',
  'fire_damage':      'fire_damage',
  'active_leak':      'active_leak',
  'peeling_paint':    'flaking_paint',
}

/** PT phrase for the raw detector label — used in descriptions. */
const LABEL_PT: Record<string, string> = {
  dent: 'amolgadela',
  scratch: 'risco/arranhão',
  crack: 'fissura/rachadura',
  glass_shatter: 'vidro partido',
  lamp_broken: 'farol partido',
  tire_flat: 'pneu em baixo',
  'Front-windscreen-damage': 'para-brisas danificado',
  'Headlight-damage': 'farol danificado',
  'Rear-windscreen-Damage': 'vidro traseiro danificado',
  'Runningboard-Damage': 'soleira danificada',
  'Sidemirror-Damage': 'espelho retrovisor danificado',
  'Taillight-Damage': 'farolim danificado',
  'bonnet-dent': 'amolgadela no capô',
  'boot-dent': 'amolgadela na tampa da mala',
  'doorouter-dent': 'amolgadela na porta',
  'fender-dent': 'amolgadela no guarda-lamas',
  'front-bumper-dent': 'para-choques frontal danificado',
  'quaterpanel-dent': 'amolgadela no painel lateral',
  'rear-bumper-dent': 'para-choques traseiro danificado',
  'roof-dent': 'amolgadela no tejadilho',
  joint: 'junta',
  mold: 'bolor',
}

/** YOLOv11n 14-class → canonical partKey (taxonomy.ts VEHICLE_PARTS keys) */
const V11N_PART_KEY: Record<string, string> = {
  'Front-windscreen-damage': 'windshield',
  'Headlight-damage':        'headlight_l',
  'Rear-windscreen-Damage':  'rear_glass',
  'Runningboard-Damage':     'rocker_l',
  'Sidemirror-Damage':       'mirror_l',
  'Taillight-Damage':        'taillight_l',
  'bonnet-dent':             'hood',
  'boot-dent':               'trunk',
  'doorouter-dent':          'door_fl',
  'fender-dent':             'fender_fl',
  'front-bumper-dent':       'bumper_f',
  'quaterpanel-dent':        'quarter_l',
  'rear-bumper-dent':        'bumper_r',
  'roof-dent':               'roof',
}

/** Generic part-context labels → canonical partKey */
const PART_HINTS: Record<string, string> = {
  'car door': 'door_fl', 'car bumper': 'bumper_f', 'car hood': 'hood',
  'car roof': 'roof', 'car trunk': 'trunk', fender: 'fender_fl',
  windshield: 'windshield', 'side window': 'side_glass', 'side mirror': 'mirror_l',
  headlight: 'headlight_l', taillight: 'taillight_l', wheel: 'wheel_fl',
  'license plate': 'plate', grille: 'grille',
  roof: 'roof_cover', 'roof tiles': 'roof_cover', wall: 'wall',
  ceiling: 'ceiling', floor: 'floor', window: 'window',
  door: 'door_ext', 'water pipe': 'plumbing', gutter: 'gutter', staircase: 'floor',
}

export async function detectDamage(buf: Buffer, profile: string, timeoutMs = 30_000): Promise<DetectResponse | null> {
  try {
    const form = new FormData()
    form.append('image', new Blob([new Uint8Array(buf)]), 'evidence.jpg')
    form.append('profile', profile === 'property' || profile === 'contents' ? 'property' : 'vehicle')
    const res = await fetch(`${DAMAGE_DETECT_URL}/detect`, {
      method: 'POST',
      body: form,
      headers: DAMAGE_DETECT_TOKEN ? { Authorization: `Bearer ${DAMAGE_DETECT_TOKEN}` } : {},
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    return (await res.json()) as DetectResponse
  } catch {
    return null // service down → caller falls back to VLM-only
  }
}

/** Canonical damageType for a model label — vehicle vs property vocabulary. */
export function damageTypeFor(label: string, asset?: string): string {
  // Property-specific remaps (labels shared across profiles)
  if (asset === 'property' || asset === 'contents') {
    if (label === 'crack') return 'crack_structural'
    if (label === 'glass_shatter') return 'broken_glass'
    if (label === 'lamp_broken') return 'other'
    if (label === 'tire_flat' || label === 'dent' || label === 'scratch') return 'other'
  }
  return LABEL_TO_TYPE[label] ?? 'other'
}

/** PT display phrase for a raw model label. */
export function labelPt(label: string): string {
  return LABEL_PT[label] ?? label
}

/** Region-grid cell (3×3) for a box center — canonical Region type. */
export function regionFor(d: Detection):
  | 'upper-left' | 'upper-center' | 'upper-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'lower-left' | 'lower-center' | 'lower-right' {
  const cx = d.nx + d.nw / 2
  const cy = d.ny + d.nh / 2
  const col = cx < 0.34 ? 'left' : cx < 0.67 ? 'center' : 'right'
  const row = cy < 0.34 ? 'upper' : cy < 0.67 ? 'middle' : 'lower'
  return row === 'middle' && col === 'center' ? 'center' : `${row}-${col}` as ReturnType<typeof regionFor>
}

/** partKey for a detection — v11n labels are self-contained; others need IoU matching. */
export function partFor(d: Detection, parts: Detection[]): string | undefined {
  // ② v11n-14cls labels encode their own part directly
  if (d.model === 'v11n-14cls' && V11N_PART_KEY[d.label]) {
    return V11N_PART_KEY[d.label]
  }
  // For cardd-seg / crack models: find spatially overlapping part context label
  let best: Detection | undefined
  let bestScore = 0
  for (const p of parts) {
    const ix = Math.max(0, Math.min(d.nx + d.nw, p.nx + p.nw) - Math.max(d.nx, p.nx))
    const iy = Math.max(0, Math.min(d.ny + d.nh, p.ny + p.nh) - Math.max(d.ny, p.ny))
    const inter = ix * iy
    const union = d.nw * d.nh + p.nw * p.nh - inter
    const iou = union > 0 ? inter / union : 0
    const cxIn = d.nx + d.nw / 2 >= p.nx && d.nx + d.nw / 2 <= p.nx + p.nw
    const cyIn = d.ny + d.nh / 2 >= p.ny && d.ny + d.nh / 2 <= p.ny + p.nh
    const score = iou + (cxIn && cyIn ? 0.2 : 0)
    if (score > bestScore) { bestScore = score; best = p }
  }
  if (!best) return doorAttachedPart(d, parts) ?? undefined

  const key = V11N_PART_KEY[best.label] ?? PART_HINTS[best.label]

  // ── Spatial fallback: damage sitting ABOVE a wheel box → it's on the fender/quarter.
  if (key?.startsWith('wheel_')) {
    const damageAbove = d.ny + d.nh / 2 < best.ny + best.nh * 0.65
    if (damageAbove) {
      const side = d.nx + d.nw / 2 < 0.5 ? 'fl' : 'fr'
      return `fender_${side}`
    }
  }
  return key
}

/** Fallback: dent horizontally attached to a door box → fender (front) or quarter (rear). */
function doorAttachedPart(d: Detection, parts: Detection[]): string | undefined {
  for (const p of parts) {
    const pk = V11N_PART_KEY[p.label] ?? PART_HINTS[p.label]
    if (!pk?.startsWith('door_')) continue
    const gap = Math.max(p.nx - (d.nx + d.nw), d.nx - (p.nx + p.nw)) // horizontal gap
    const vOverlap = Math.min(d.ny + d.nh, p.ny + p.nh) - Math.max(d.ny, p.ny)
    if (gap < 0.18 && vOverlap > 0) {
      const side = pk.endsWith('_l') || pk.endsWith('fl') ? 'fl' : 'fr'
      const quarterKey = pk.endsWith('_l') || pk.endsWith('fl') ? 'quarter_l' : 'quarter_r'
      // dent center toward image-right of the door → fender (front); left → quarter panel
      return d.nx + d.nw / 2 > p.nx + p.nw / 2 ? `fender_${side}` : quarterKey
    }
  }
  return undefined
}

/** Typical real-world sizes (w×h cm) per partKey — used to scale detector boxes. */
const PART_TYPICAL_CM: Record<string, [number, number]> = {
  door_fl: [110, 65], door_fr: [110, 65], door_rl: [95, 65], door_rr: [95, 65],
  bumper_f: [175, 35], bumper_r: [175, 35], hood: [140, 85], trunk: [120, 55],
  fender_fl: [70, 45], fender_fr: [70, 45], fender_rl: [70, 45], fender_rr: [70, 45],
  quarter_l: [90, 60], quarter_r: [90, 60], roof: [200, 120], rock_l: [120, 15],
  rocker_l: [120, 15], rocker_r: [120, 15],
  windshield: [130, 70], rear_glass: [120, 55], side_glass: [70, 45],
  headlight_l: [45, 25], headlight_r: [45, 25], taillight_l: [35, 20], taillight_r: [35, 20],
  mirror_l: [20, 15], mirror_r: [20, 15], wheel_fl: [60, 60], wheel_fr: [60, 60],
  wheel_rl: [60, 60], wheel_rr: [60, 60], grille: [90, 30], plate: [52, 11],
}

/** Rough real-world size + %-of-part for a detection, using the best part box as ruler. */
export function sizeEstimateFor(
  d: Detection,
  parts: Detection[],
  partKey?: string,
): string | undefined {
  // Find the most-overlapping part box (same scoring as partFor, but keep the box)
  let best: Detection | undefined
  let bestScore = 0
  for (const p of parts) {
    const ix = Math.max(0, Math.min(d.nx + d.nw, p.nx + p.nw) - Math.max(d.nx, p.nx))
    const iy = Math.max(0, Math.min(d.ny + d.nh, p.ny + p.nh) - Math.max(d.ny, p.ny))
    const inter = ix * iy
    const union = d.nw * d.nh + p.nw * p.nh - inter
    const iou = union > 0 ? inter / union : 0
    const cxIn = d.nx + d.nw / 2 >= p.nx && d.nx + d.nw / 2 <= p.nx + p.nw
    const cyIn = d.ny + d.nh / 2 >= p.ny && d.ny + d.nh / 2 <= p.ny + p.nh
    const score = iou + (cxIn && cyIn ? 0.2 : 0)
    if (score > bestScore) { bestScore = score; best = p }
  }

  const imageAreaPct = Math.round(d.nw * d.nh * 100)

  if (best) {
    const typical = PART_TYPICAL_CM[partKey ?? ''] ??
      PART_TYPICAL_CM[V11N_PART_KEY[best.label] ?? ''] ??
      PART_TYPICAL_CM[PART_HINTS[best.label] ?? '']
    const partAreaPct = Math.round(((d.nw * d.nh) / Math.max(0.01, best.nw * best.nh)) * 100)
    if (typical) {
      // Ruler is only valid when the damage is mostly INSIDE the part box —
      // an unattributed detection can be larger than the part box itself.
      const insideX = Math.min(d.nx + d.nw, best.nx + best.nw) - Math.max(d.nx, best.nx)
      const insideY = Math.min(d.ny + d.nh, best.ny + best.nh) - Math.max(d.ny, best.ny)
      const contained = (Math.max(0, insideX) * Math.max(0, insideY)) / (d.nw * d.nh)
      if (contained >= 0.6) {
        const cmPerNx = typical[0] / best.nw
        const cmPerNy = typical[1] / best.nh
        const wCm = Math.min(typical[0], Math.max(1, Math.round(d.nw * cmPerNx)))
        const hCm = Math.min(typical[1], Math.max(1, Math.round(d.nh * cmPerNy)))
        return `≈${wCm}×${hCm}cm · ${Math.min(95, partAreaPct)}% do painel`
      }
      return `${Math.min(95, partAreaPct)}% do painel`
    }
    return `${Math.min(95, partAreaPct)}% do painel (${imageAreaPct}% imagem)`
  }
  return `${imageAreaPct}% da imagem`
}

/** Detectors that can provide part context — generic part boxes + v11n part-damage boxes. */
export function partProviders(det: { parts: Detection[]; damage: Detection[] }): Detection[] {
  return [...det.parts, ...det.damage.filter((d) => d.model === 'v11n-14cls')]
}

/** Severity from relative damage area — tuned vs Felirent bands. */
export function severityFor(d: Detection): 'minor' | 'moderate' | 'severe' {
  const area = d.nw * d.nh
  if (area > 0.15 || d.conf > 0.8) return 'severe'
  if (area > 0.04 || d.conf > 0.4) return 'moderate'
  return 'minor'
}
