// Prompt contracts for the vision pipeline (JSON-only responses).
// Grounded in the research (see docs/INSURANCE_AI_STUDY.md §taxonomy):
// - Canonical part/zone lists force consistent "location" naming across
//   images — required for multi-frame merge (CDDM 9×3, Pixemantic-29).
// - Spatial rules + lookalikes baked in (Tarpit59 Stage 4, roof-YOLO
//   non_damage_lookalike) to cut VLM false positives.
// - 3×3 region grid instead of pixel bboxes (MiniCPM-V grounding too weak).
// - Severity bands from Felirent Damage Matrix + 211 CMR repair rules.
// - sourceHint for water damage (RICS JPS 2022 / InterNACHI telltales).

import {
  COVERAGE_VIEWS,
  LOOKALIKE_WARNING,
  REGION_GRID,
  WATER_SOURCE_RULES,
  damageTypesFor,
  partsFor,
} from './taxonomy'
import type { AssetType } from './types'

function partsList(asset: AssetType): string {
  const ps = partsFor(asset)
  if (!ps.length) return '(item/conteúdo)'
  return ps.map((p) => `${p.key}=${p.label}`).join(', ')
}

function damageList(asset: AssetType): string {
  return damageTypesFor(asset)
    .map((d) => `${d.key}${d.severityHint ? ` (${d.severityHint})` : ''}`)
    .join(', ')
}

function spatialRules(asset: AssetType): string {
  if (asset === 'vehicle') {
    return `REGRAS ESPACIAIS (respeitar à risca):
- dent/amolgadela NUNCA em vidro, farol ou pneu — apenas painéis
- glass_shatter APENAS em partes de vidro; lamp_broken APENAS em faróis/farolins
- tire_flat/wheel_damage APENAS em roda/jante/pneu
- hail_damage só em superfícies horizontais (capô, tejadilho, mala, tecto de abrir)
- corrosion em metal (painéis, mecânica, jantes)`
  }
  if (asset === 'property') {
    return `REGRAS ESPACIAIS (respeitar à risca):
- missing_shingle/hail_hit/wind_crease/granule_loss APENAS em elementos de telhado
- crack_structural apenas em parede/estrutura; fissura capilar fina reta = crack_hairline
- damp_rising só junto a rodapés/paredes exteriores; condensation em cantos frios/janelas
- broken_glass em janelas/vidros, nunca em parede`
  }
  return ''
}

function coverageList(asset: AssetType): string {
  return COVERAGE_VIEWS[asset].join(' | ')
}

/**
 * Per-image analysis prompt — structured findings + authenticity + quality +
 * coverage label + lookalikes, in ONE VLM call.
 */
export function damagePrompt(asset: AssetType, context?: string): string {
  const assetLabel =
    asset === 'vehicle' ? 'veículo automóvel' : asset === 'property' ? 'imóvel/habitação' : 'bens/conteúdo'
  const waterBlock = asset === 'property' ? `\n${WATER_SOURCE_RULES}\n` : ''

  return `És um perito de seguros a analisar UMA foto de evidência de sinistro${context ? ` (contexto: ${context})` : ''}.
O bem segurado é "${assetLabel}".

TAREFA 1 — COBERTURA:
Identifica que vista esta imagem mostra. coverageView ∈ {${coverageList(asset)} | "outro"}.

TAREFA 2 — DANOS:
Deteta CADA dano visível e relevante para o sinistro.
damageType ∈ {${damageList(asset)}}
partKey ∈ {${partsList(asset)}} — usa SEMPRE a key canónica; "location" = o rótulo PT correspondente.
Para cada dano: severity ∈ {"minor"|"moderate"|"severe"} seguindo as bandas indicadas;
confidence 0..1 (NUNCA inventar — em dúvida, não listar);
region ∈ {${REGION_GRID}} (grelha 3×3 da imagem);
sizeEstimate (estimativa real, ex. "≈15×8cm", "≈2 telhas", "≈3m²" — usa referências visíveis);
preExisting=true se houver sinais de dano antigo (ferrugem sobre o dano, massa/tinta descorada, reparação prévia);
repairType ∈ {"polish","pdr","repair_paint","seal","clean","treat","repair","replace","remediate","monitor","investigate"}
  (regra: reparar salvo se peça destruída, custo reparação > substituição, ou segurança comprometida — 211 CMR);
repairAction (o que faria um reparador, PT);
estCostEur {min,max} — mercado português realista.

${spatialRules(asset)}
${waterBlock}
TAREFA 3 — AUTENTICIDADE:
isRealPhoto=false se parecer desenho, screenshot de ecrã, imagem gerada por IA, foto de stock, ou conteúdo sem relação — explica em photoConcern.

TAREFA 4 — QUALIDADE:
imageQuality ∈ {"good","usable","poor"}; qualityIssues (blur, dark, overexposed, too_far, cropped, duplicate_angle).

${LOOKALIKE_WARNING}

Se não houver dano visível: findings=[] (não inventar).

Responde APENAS com JSON:
{"coverageView":"...","assetVisible":"vehicle|property|contents|other|none","isRealPhoto":true,"photoConcern":"opcional","imageQuality":"good","qualityIssues":[],"lookalikes":[],"findings":[{"damageType":"...","partKey":"...","location":"...","region":"center","severity":"minor","confidence":0.9,"description":"...","sizeEstimate":"≈10cm","preExisting":false,"repairType":"repair_paint","repairAction":"...","sourceHint":"opcional","estCostEur":{"min":0,"max":0}}],"summary":"uma frase em português europeu"}`
}

/**
 * Claim-level aggregation + consistency verification (MMLM-CA style).
 * Now includes coverage assessment vs the shot checklist.
 */
export function aggregatePrompt(params: {
  asset: AssetType
  assetDescription?: string
  incidentType?: string
  incidentDate?: string
  narrative?: string
  perImageSummaries: string[]
  coverageViewsSeen: string[]
  expectedViews: string[]
  mergedFindings: string
  preExistingCount: number
}): string {
  const {
    asset,
    assetDescription,
    incidentType,
    incidentDate,
    narrative,
    perImageSummaries,
    coverageViewsSeen,
    expectedViews,
    mergedFindings,
    preExistingCount,
  } = params

  const missingViews = expectedViews.filter((v) => !coverageViewsSeen.includes(v))

  return `És um perito sénior a escrever a análise do sinistro em português europeu.

CONTEXTO DO SINISTRO:
- Bem: ${asset}${assetDescription ? ` — ${assetDescription}` : ''}
- Ocorrência: ${incidentType ?? 'n/d'} em ${incidentDate ?? 'n/d'}
- Narrativa do segurado: "${narrative ?? 'n/d'}"

EVIDÊNCIA (resumos por foto/frame):
${perImageSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

COBERTURA VISUAL:
- Vistas capturadas: ${coverageViewsSeen.join(', ') || 'nenhuma identificada'}
- Vistas em falta vs checklist: ${missingViews.join(', ') || 'nenhuma (cobertura completa)'}
- Achados com sinais de dano pré-existente: ${preExistingCount}

DANOS AGREGADOS (JSON):
${mergedFindings}

TAREFAS:
1) consistencyCheck — os danos visíveis correspondem à narrativa e ao tipo de ocorrência?
   Sinaliza mismatches implausíveis (ex.: alega granizo mas foto mostra mossa de colisão;
   sinistro "ontem" mas ferrugem sobre o dano; cobertura insuficiente p/ confirmar).
   consistent:true|false + notes (incluir falhas de cobertura se relevantes).
2) reportText — rascunho profissional do perito em PT-PT com secções:
   RESUMO DO SINISTRO / COBERTURA DA EVIDÊNCIA / DANOS IDENTIFICADOS
   (bullets: tipo — peça/zona — severidade — custo est.) / AVALIAÇÃO DE COERÊNCIA /
   DANO PRÉ-EXISTENTE (se aplicável) / PONTOS A VERIFICAR (vistas em falta, causa de água,
   medições presenciais) / RECOMENDAÇÃO. Máx ~350 palavras.
   Linha final obrigatória: "Análise por IA — sujeita a validação de perito."
3) overallSeverity — pior severidade global plausível: "none"|"minor"|"moderate"|"severe".
   severe se: estrutura comprometida, vidro/segurança, fuga ativa, incêndio, airbag,
   fissura estrutural, ou custo total > €5.000.

Responde APENAS com JSON:
{"consistencyCheck":{"consistent":true,"notes":"..."},"overallSeverity":"moderate","reportText":"..."}`
}
