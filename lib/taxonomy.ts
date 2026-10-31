// Canonical insurance damage taxonomy (research-grounded):
// - Vehicle: CDDM 9-component×3-type, CarDD, Pixemantic VehicleDamage-29,
//   Ultralytics carparts-seg, Tarpit59 AutoScan spatial rules,
//   Felirent Damage Matrix severity bands, 211 CMR repair/replace rules
// - Property: InspectorRoofing roof classes (incl. non_damage_lookalike),
//   Nearmap detections, RICS damp JPS source attribution, InterNACHI telltales,
//   Roboflow wall/water-damage classes, Kled damage-in-your-home types.

import type { AssetType, Severity } from './types'

// ---------- Canonical part/zone keys (PT labels) ----------

export interface PartDef {
  key: string
  label: string // PT canonical name
  kind: 'body_panel' | 'glass' | 'lamp' | 'wheel' | 'trim' | 'interior' | 'mechanical' | 'structure' | 'surface' | 'fixture' | 'roof_element' | 'plumbing' | 'opening' | 'electrical'
  sideDependent?: boolean
  horizontal?: boolean // exposed to hail
}

export const VEHICLE_PARTS: PartDef[] = [
  { key: 'bumper_f', label: 'para-choques frontal', kind: 'body_panel', horizontal: true },
  { key: 'bumper_r', label: 'para-choques traseiro', kind: 'body_panel' },
  { key: 'hood', label: 'capô', kind: 'body_panel', horizontal: true },
  { key: 'roof', label: 'tejadilho', kind: 'body_panel', horizontal: true },
  { key: 'trunk', label: 'tampa da mala', kind: 'body_panel', horizontal: true },
  { key: 'fender_fl', label: 'guarda-lamas dianteiro esquerdo', kind: 'body_panel', sideDependent: true },
  { key: 'fender_fr', label: 'guarda-lamas dianteiro direito', kind: 'body_panel', sideDependent: true },
  { key: 'fender_rl', label: 'guarda-lamas traseiro esquerdo', kind: 'body_panel', sideDependent: true },
  { key: 'fender_rr', label: 'guarda-lamas traseiro direito', kind: 'body_panel', sideDependent: true },
  { key: 'door_fl', label: 'porta dianteira esquerda', kind: 'body_panel', sideDependent: true },
  { key: 'door_fr', label: 'porta dianteira direita', kind: 'body_panel', sideDependent: true },
  { key: 'door_rl', label: 'porta traseira esquerda', kind: 'body_panel', sideDependent: true },
  { key: 'door_rr', label: 'porta traseira direita', kind: 'body_panel', sideDependent: true },
  { key: 'quarter_l', label: 'painel lateral esquerdo (quarter)', kind: 'body_panel', sideDependent: true },
  { key: 'quarter_r', label: 'painel lateral direito (quarter)', kind: 'body_panel', sideDependent: true },
  { key: 'rocker_l', label: 'soleira esquerda', kind: 'body_panel', sideDependent: true },
  { key: 'rocker_r', label: 'soleira direita', kind: 'body_panel', sideDependent: true },
  { key: 'pillar', label: 'pilar/coluna', kind: 'structure' },
  { key: 'grille', label: 'grelha frontal', kind: 'trim' },
  { key: 'headlight_l', label: 'farol dianteiro esquerdo', kind: 'lamp', sideDependent: true },
  { key: 'headlight_r', label: 'farol dianteiro direito', kind: 'lamp', sideDependent: true },
  { key: 'taillight_l', label: 'farolim traseiro esquerdo', kind: 'lamp', sideDependent: true },
  { key: 'taillight_r', label: 'farolim traseiro direito', kind: 'lamp', sideDependent: true },
  { key: 'foglight', label: 'farol de nevoeiro', kind: 'lamp' },
  { key: 'mirror_l', label: 'espelho retrovisor esquerdo', kind: 'trim', sideDependent: true },
  { key: 'mirror_r', label: 'espelho retrovisor direito', kind: 'trim', sideDependent: true },
  { key: 'windshield', label: 'para-brisas', kind: 'glass' },
  { key: 'rear_glass', label: 'vidro traseiro', kind: 'glass' },
  { key: 'side_glass', label: 'vidro lateral', kind: 'glass', sideDependent: true },
  { key: 'sunroof', label: 'tecto de abrir', kind: 'glass', horizontal: true },
  { key: 'wheel_fl', label: 'roda dianteira esquerda', kind: 'wheel', sideDependent: true },
  { key: 'wheel_fr', label: 'roda dianteira direita', kind: 'wheel', sideDependent: true },
  { key: 'wheel_rl', label: 'roda traseira esquerda', kind: 'wheel', sideDependent: true },
  { key: 'wheel_rr', label: 'roda traseira direita', kind: 'wheel', sideDependent: true },
  { key: 'plate', label: 'matrícula', kind: 'trim' },
  { key: 'engine_bay', label: 'compartimento do motor', kind: 'mechanical' },
  { key: 'underbody', label: 'parte inferior/carter', kind: 'mechanical' },
  { key: 'exhaust', label: 'escape', kind: 'mechanical' },
  { key: 'interior', label: 'interior/habitáculo', kind: 'interior' },
  { key: 'airbag_zone', label: 'zona de airbags', kind: 'interior' },
]

export const PROPERTY_ZONES: PartDef[] = [
  { key: 'roof_cover', label: 'cobertura do telhado (telhas)', kind: 'roof_element', horizontal: true },
  { key: 'roof_ridge', label: 'cumeeira', kind: 'roof_element', horizontal: true },
  { key: 'flashing', label: 'rufos/flashings (chaminé, vãos)', kind: 'roof_element' },
  { key: 'gutter', label: 'caleiras/algerozes e descidas', kind: 'roof_element' },
  { key: 'chimney', label: 'chaminé', kind: 'roof_element' },
  { key: 'skylight', label: 'clarabóia/janela de telhado', kind: 'roof_element' },
  { key: 'roof_structure', label: 'estrutura do telhado (madeiramento)', kind: 'structure' },
  { key: 'facade', label: 'fachada/reboco exterior', kind: 'surface' },
  { key: 'wall', label: 'parede', kind: 'surface' },
  { key: 'ceiling', label: 'teto', kind: 'surface', horizontal: true },
  { key: 'floor', label: 'pavimento/chão', kind: 'surface' },
  { key: 'window', label: 'janela/caixilharia', kind: 'opening' },
  { key: 'door_int', label: 'porta interior', kind: 'opening' },
  { key: 'door_ext', label: 'porta de entrada/exterior', kind: 'opening' },
  { key: 'kitchen', label: 'cozinha (móveis/bancada)', kind: 'fixture' },
  { key: 'bathroom', label: 'casa de banho (loiças/azulejos)', kind: 'fixture' },
  { key: 'plumbing', label: 'canalização/tubagens', kind: 'plumbing' },
  { key: 'heating', label: 'aquecimento/esquentador', kind: 'plumbing' },
  { key: 'electrical', label: 'quadro elétrico/instalação', kind: 'fixture' },
  { key: 'basement', label: 'cave/garagem/anexo', kind: 'surface' },
  { key: 'structure', label: 'estrutura (vigas, pilares, laje)', kind: 'structure' },
  { key: 'insulation', label: 'isolamento/sótão', kind: 'surface' },
  { key: 'pool_ext', label: 'exterior/piscina/muro', kind: 'surface' },
]

export function partsFor(asset: AssetType): PartDef[] {
  return asset === 'vehicle' ? VEHICLE_PARTS : asset === 'property' ? PROPERTY_ZONES : []
}

export function partLabel(asset: AssetType, key: string): string | undefined {
  return partsFor(asset).find((p) => p.key === key)?.label
}

// ---------- Damage types ----------

export interface DamageTypeDef {
  key: string
  label: string
  allowedKinds: PartDef['kind'][] // spatial validation (Tarpit59 Stage 4)
  extraAllowedKeys?: string[] // fine-grained exceptions
  severityHint?: string
}

export const VEHICLE_DAMAGE: DamageTypeDef[] = [
  { key: 'scratch', label: 'risco/arranhão', allowedKinds: ['body_panel', 'glass', 'lamp', 'trim', 'wheel'], severityHint: '<2cm cosmético; ≤10cm ligeiro; >10cm ou até ao primário/metal = pintura do painel' },
  { key: 'paint_chip', label: 'pintura lascada', allowedKinds: ['body_panel', 'trim', 'wheel'] },
  { key: 'dent', label: 'amolgadela/mossa', allowedKinds: ['body_panel'], severityHint: '≤10×5cm ligeiro (PDR); ≤40×40cm moderado; >40×40cm, vinco, aresta ou zona de deformação programada = substituir' },
  { key: 'crack', label: 'fissura/rachadura', allowedKinds: ['body_panel', 'glass', 'lamp', 'trim'] },
  { key: 'glass_shatter', label: 'vidro partido/estilhaçado', allowedKinds: ['glass'] },
  { key: 'lamp_broken', label: 'farol/farolim partido', allowedKinds: ['lamp'] },
  { key: 'tire_flat', label: 'pneu furado/rasgado', allowedKinds: ['wheel'] },
  { key: 'wheel_damage', label: 'jante danificada', allowedKinds: ['wheel'] },
  { key: 'panel_deformation', label: 'painel deformado/empenado', allowedKinds: ['body_panel', 'structure'] },
  { key: 'misalignment', label: 'desalinhamento (folgas irregulares)', allowedKinds: ['body_panel', 'structure', 'trim'] },
  { key: 'missing_part', label: 'peça em falta', allowedKinds: ['trim', 'body_panel', 'lamp', 'wheel', 'glass'] },
  { key: 'broken_part', label: 'peça partida/solta', allowedKinds: ['trim', 'body_panel', 'lamp', 'wheel', 'mechanical'] },
  { key: 'corrosion', label: 'corrosão/ferrugem', allowedKinds: ['body_panel', 'mechanical', 'wheel', 'structure'] },
  { key: 'flaking', label: 'pintura a descascar', allowedKinds: ['body_panel', 'trim', 'wheel'] },
  { key: 'hail_damage', label: 'dano de granizo (múltiplas mossas pequenas)', allowedKinds: ['body_panel', 'glass'] },
  { key: 'fluid_leak', label: 'fuga de fluido (óleo/líquido)', allowedKinds: ['mechanical'] },
  { key: 'airbag_deployed', label: 'airbag disparado', allowedKinds: ['interior'] },
  { key: 'interior_damage', label: 'dano interior', allowedKinds: ['interior'] },
  { key: 'burn', label: 'queimadura/fogo', allowedKinds: ['body_panel', 'interior', 'trim', 'mechanical', 'lamp', 'glass', 'wheel'] },
  { key: 'flood_damage', label: 'dano por inundação', allowedKinds: ['interior', 'mechanical', 'body_panel'] },
  { key: 'other', label: 'outro', allowedKinds: ['body_panel', 'glass', 'lamp', 'wheel', 'trim', 'interior', 'mechanical', 'structure'] },
]

export const PROPERTY_DAMAGE: DamageTypeDef[] = [
  // Water family — source attribution matters (RICS JPS 2022)
  { key: 'water_stain', label: 'mancha de água (anéis castanhos)', allowedKinds: ['surface', 'roof_element', 'fixture'] },
  { key: 'active_leak', label: 'fuga/infiltração ativa', allowedKinds: ['plumbing', 'roof_element', 'surface', 'opening'] },
  { key: 'damp_rising', label: 'humidade ascendente (marca de maré + salitre junto ao rodapé)', allowedKinds: ['surface'] },
  { key: 'damp_condensation', label: 'condensação (cantos frios, janelas)', allowedKinds: ['surface', 'opening'] },
  { key: 'mold', label: 'bolor/mofo', allowedKinds: ['surface', 'fixture', 'opening'] },
  { key: 'efflorescence', label: 'salitre/eflorescência (depósito branco)', allowedKinds: ['surface'] },
  { key: 'flood_damage', label: 'dano por cheia/inundação', allowedKinds: ['surface', 'fixture', 'plumbing', 'electrical'] },
  // Cracks
  { key: 'crack_hairline', label: 'fissura capilar (fina, reta)', allowedKinds: ['surface', 'roof_element'] },
  { key: 'crack_structural', label: 'fissura estrutural (diagonal/escalonada >1mm, cantos de vãos)', allowedKinds: ['surface', 'structure'] },
  // Roof (InspectorRoofing classes)
  { key: 'missing_shingle', label: 'telha em falta/deslocada', allowedKinds: ['roof_element'] },
  { key: 'hail_hit', label: 'impacto de granizo (telha/metal mole)', allowedKinds: ['roof_element', 'surface'] },
  { key: 'wind_crease', label: 'telha levantada/vincada pelo vento', allowedKinds: ['roof_element'] },
  { key: 'granule_loss', label: 'perda de granulado (telha)', allowedKinds: ['roof_element'] },
  { key: 'soft_metal_impact', label: 'dent em chapa/rufos/ventilação', allowedKinds: ['roof_element'] },
  { key: 'gutter_damage', label: 'caleira danificada/entupida/descolada', allowedKinds: ['roof_element'] },
  { key: 'roof_structure_damage', label: 'estrutura do telhado danificada/cedida', allowedKinds: ['structure', 'roof_element'] },
  // Surfaces
  { key: 'flaking_paint', label: 'tinta a escamar/bolhas', allowedKinds: ['surface'] },
  { key: 'peeling_wallpaper', label: 'papel de parede a descolar', allowedKinds: ['surface'] },
  { key: 'impact_hole', label: 'buraco/perfuração por impacto', allowedKinds: ['surface', 'opening', 'fixture'] },
  { key: 'broken_tile', label: 'azulejo/ladrilho partido', allowedKinds: ['surface', 'fixture'] },
  { key: 'floor_damage', label: 'pavimento danificado (empenamento, manchas)', allowedKinds: ['surface'] },
  { key: 'sagging_ceiling', label: 'teto a ceder/barrigado', allowedKinds: ['surface', 'structure'] },
  { key: 'rot', label: 'apodrecimento de madeira', allowedKinds: ['structure', 'opening', 'roof_element'] },
  { key: 'corrosion', label: 'corrosão (metais, tubagens)', allowedKinds: ['plumbing', 'fixture', 'structure'] },
  // Openings / fixtures
  { key: 'broken_glass', label: 'vidro partido', allowedKinds: ['opening', 'fixture'] },
  { key: 'frame_damage', label: 'caixilharia/aro danificado', allowedKinds: ['opening'] },
  { key: 'vandalism', label: 'vandalismo/grafiti/quebra intencional', allowedKinds: ['surface', 'opening', 'fixture', 'roof_element'] },
  { key: 'fire_damage', label: 'dano de fogo/queimadura', allowedKinds: ['surface', 'structure', 'fixture', 'roof_element', 'opening', 'plumbing'] },
  { key: 'smoke_damage', label: 'dano de fumo/fuligem', allowedKinds: ['surface', 'fixture', 'opening'] },
  { key: 'damaged_fixture', label: 'aparelho/louça/eletrodoméstico danificado', allowedKinds: ['fixture', 'plumbing', 'electrical'] },
  { key: 'other', label: 'outro', allowedKinds: ['surface', 'structure', 'fixture', 'roof_element', 'opening', 'plumbing', 'electrical'] },
]

export function damageTypesFor(asset: AssetType): DamageTypeDef[] {
  if (asset === 'vehicle') return VEHICLE_DAMAGE
  if (asset === 'property') return PROPERTY_DAMAGE
  return [
    { key: 'broken', label: 'partido', allowedKinds: ['fixture', 'surface'] },
    { key: 'cracked', label: 'rachado', allowedKinds: ['fixture', 'surface'] },
    { key: 'burned', label: 'queimado', allowedKinds: ['fixture', 'surface'] },
    { key: 'water_damaged', label: 'dano por água', allowedKinds: ['fixture', 'surface'] },
    { key: 'shattered', label: 'estilhaçado', allowedKinds: ['fixture', 'surface'] },
    { key: 'torn', label: 'rasgado', allowedKinds: ['fixture', 'surface'] },
    { key: 'missing', label: 'em falta', allowedKinds: ['fixture', 'surface'] },
    { key: 'other', label: 'outro', allowedKinds: ['fixture', 'surface'] },
  ]
}

// ---------- Spatial validation (Tarpit59 Stage 4) ----------

/** Is `damageKey` physically plausible on `partKey`? */
export function isPlausible(asset: AssetType, damageKey: string, partKey: string): boolean {
  const part = partsFor(asset).find((p) => p.key === partKey)
  const dmg = damageTypesFor(asset).find((d) => d.key === damageKey)
  if (!part || !dmg) return true // unknown → don't censor
  if (dmg.extraAllowedKeys?.includes(partKey)) return true
  return dmg.allowedKinds.includes(part.kind)
}

// ---------- Severity bands (Felirent matrix + 211 CMR) ----------

export type RepairType = 'polish' | 'pdr' | 'repair_paint' | 'seal' | 'clean' | 'treat' | 'repair' | 'replace' | 'remediate' | 'monitor' | 'investigate'

export const REPAIR_LABELS: Record<RepairType, string> = {
  polish: 'polimento',
  pdr: 'PDR (martelinho de ouro)',
  repair_paint: 'reparar + pintar',
  seal: 'vedação/selagem',
  clean: 'limpeza',
  treat: 'tratamento (bolor/corrosão)',
  repair: 'reparação',
  replace: 'substituição',
  remediate: 'remediação (secagem/descontaminação)',
  monitor: 'monitorizar (fissura ativa?)',
  investigate: 'investigar causa (caçafugas/peritagem)',
}

// ---------- Cost bands PT (EUR) for sanity-capping VLM estimates ----------

export interface CostBand { min: number; max: number }

/** Typical PT repair cost band by repairType+severity. Used to cap VLM guesses. */
export function costBand(asset: AssetType, repairType: RepairType | undefined, severity: Severity): CostBand {
  const V: Record<RepairType, Record<Severity, CostBand>> = {
    polish:       { minor: { min: 40, max: 120 }, moderate: { min: 80, max: 200 }, severe: { min: 150, max: 300 } },
    pdr:          { minor: { min: 60, max: 180 }, moderate: { min: 150, max: 350 }, severe: { min: 300, max: 600 } },
    repair_paint: { minor: { min: 120, max: 300 }, moderate: { min: 250, max: 600 }, severe: { min: 500, max: 1200 } },
    seal:         { minor: { min: 60, max: 200 }, moderate: { min: 150, max: 500 }, severe: { min: 400, max: 1200 } },
    clean:        { minor: { min: 30, max: 120 }, moderate: { min: 100, max: 400 }, severe: { min: 300, max: 900 } },
    treat:        { minor: { min: 80, max: 300 }, moderate: { min: 250, max: 900 }, severe: { min: 800, max: 2500 } },
    repair:       { minor: { min: 100, max: 300 }, moderate: { min: 250, max: 800 }, severe: { min: 700, max: 2500 } },
    replace:      { minor: { min: 150, max: 500 }, moderate: { min: 400, max: 1500 }, severe: { min: 1200, max: 5000 } },
    remediate:    { minor: { min: 150, max: 500 }, moderate: { min: 400, max: 1500 }, severe: { min: 1200, max: 6000 } },
    monitor:      { minor: { min: 0, max: 100 }, moderate: { min: 50, max: 300 }, severe: { min: 200, max: 800 } },
    investigate:  { minor: { min: 100, max: 300 }, moderate: { min: 200, max: 600 }, severe: { min: 400, max: 1500 } },
  }
  const P: Record<RepairType, Record<Severity, CostBand>> = {
    polish:       { minor: { min: 50, max: 150 }, moderate: { min: 100, max: 300 }, severe: { min: 200, max: 500 } },
    pdr:          { minor: { min: 50, max: 150 }, moderate: { min: 100, max: 300 }, severe: { min: 200, max: 500 } },
    repair_paint: { minor: { min: 150, max: 400 }, moderate: { min: 300, max: 900 }, severe: { min: 800, max: 2500 } },
    seal:         { minor: { min: 150, max: 400 }, moderate: { min: 300, max: 900 }, severe: { min: 800, max: 2500 } },
    clean:        { minor: { min: 100, max: 300 }, moderate: { min: 250, max: 700 }, severe: { min: 600, max: 1800 } },
    treat:        { minor: { min: 150, max: 500 }, moderate: { min: 400, max: 1500 }, severe: { min: 1200, max: 4000 } },
    repair:       { minor: { min: 200, max: 600 }, moderate: { min: 500, max: 2000 }, severe: { min: 1800, max: 8000 } },
    replace:      { minor: { min: 300, max: 1000 }, moderate: { min: 800, max: 4000 }, severe: { min: 3500, max: 15000 } },
    remediate:    { minor: { min: 300, max: 800 }, moderate: { min: 600, max: 2500 }, severe: { min: 2000, max: 8000 } },
    monitor:      { minor: { min: 0, max: 150 }, moderate: { min: 100, max: 400 }, severe: { min: 300, max: 1000 } },
    investigate:  { minor: { min: 150, max: 400 }, moderate: { min: 300, max: 900 }, severe: { min: 700, max: 2500 } },
  }
  const table = asset === 'vehicle' ? V : P
  return (table[repairType ?? 'repair'] ?? table.repair)[severity]
}

// ---------- Non-damage lookalikes (InspectorRoofing non_damage_lookalike) ----------

export const LOOKALIKE_WARNING = `CUIDADO — não reportar como dano (falsos positivos comuns):
musgo/alga, líquenes, sujidade, manchas de idade, reparações antigas seladas,
detritos/folhas, sombras e reflexos, padrões de textura, silicone/vedante antigo,
gotículas de água de lavagem, desgaste normal de uso, etiquetas/autocolantes.
Se vires algo parecido mas NÃO dano real, lista-o em "lookalikes" em vez de "findings".`

// ---------- Water-source attribution hints (RICS JPS / InterNACHI) ----------

export const WATER_SOURCE_RULES = `Atribuição de origem de água (sourceHint) — pistas visuais:
- "roof_leak": mancha em teto/anel castanho, abaixo de telhado/vale/chaminé
- "plumbing": mancha sob casa de banho/cozinha, perto de tubagens visíveis
- "rising_damp": marca de maré baixa (<1m), salitre, junto a rodapé/parede exterior
- "condensation": bolor em cantos frios, caixilharia molhada, divisões húmidas sem rastreio
- "penetrating": mancha localizada após parede com defeito exterior visível
- "flood": linha de água uniforme, lama/sedimento, múltiplas divisões ao mesmo nível
- "unknown": sem pista suficiente — propor caçafugas`

// ---------- 3×3 region grid (MiniCPM grounding is weak → grid zones) ----------

export const REGION_GRID = `upper-left|upper-center|upper-right|middle-left|center|middle-right|lower-left|lower-center|lower-right`

// ---------- Coverage checklists (CDDM multi-view + guided capture) ----------

export const COVERAGE_VIEWS: Record<AssetType, string[]> = {
  vehicle: [
    'frente', 'traseira', 'lateral esquerda', 'lateral direita',
    'tejadilho', 'interior', 'rodas/pneus', 'matrícula/VIN', 'odómetro', 'close-up por dano',
  ],
  property: [
    'fachada exterior', 'telhado', 'cada divisão afetada (vista ampla)',
    'origem provável (canalização/janela/telhado)', 'close-up por dano com referência de escala',
  ],
  contents: ['cada item danificado por inteiro', 'número de série/etiqueta', 'close-up por dano'],
  other: ['vista geral', 'close-up por dano'],
}
