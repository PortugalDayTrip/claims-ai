// Domain types for the claims pipeline.

export type AssetType = 'vehicle' | 'property' | 'contents' | 'other'
export type ClaimStatus =
  | 'awaiting_evidence'
  | 'evidence_received'
  | 'analyzing'
  | 'analyzed'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'closed'

export type Severity = 'minor' | 'moderate' | 'severe'
export type TriageVerdict = 'stp_eligible' | 'manual_review' | 'siu_investigate'

export interface ClaimFnol {
  claimantName: string
  claimantEmail: string
  claimantPhone?: string
  policyNumber?: string
  assetType: AssetType
  assetDescription?: string // e.g. "VW Golf 2019, preto" | "Apartamento T2, Lisboa"
  incidentDate?: string // ISO date
  incidentTime?: string // "14:30" — coverage verification needs time too
  incidentLocation?: string
  incidentType?: string // e.g. colisão, tempestade, roubo, incêndio, inundação
  narrative?: string // free text from claimant
  // ── Guided intake (2026 FNOL standard) ─────────────────────────────
  injuries?: boolean        // sinal de urgência — indemnity path muda
  injuryDetail?: string
  drivable?: boolean        // veículo conduzível — próximo passo do cliente
  needsTow?: boolean
  needsRental?: boolean
  vin?: string              // 17 chars — valida o bem segurado
  odometerKm?: number
  thirdPartyPlate?: string  // outro veículo envolvido
  thirdPartyName?: string
  thirdPartyUninsured?: boolean // terceiro sem seguro/identificado → FGA
  witnesses?: string
  policeReport?: string     // nº do auto/DAAA
  circumstances?: string[]  // DAAA-style circunstâncias do acidente (auto)
  incidentLat?: number      // geolocalização opt-in (e-SEGURNET benchmark)
  incidentLng?: number
  declarationAccepted?: boolean // declaração de veracidade (assinatura simples eIDAS)
  declarationAt?: string
  preferredContact?: 'email' | 'phone' | 'whatsapp'
}

export interface Claim {
  id: string
  token: string // unguessable customer link
  createdAt: string
  updatedAt: string
  status: ClaimStatus
  fnol: ClaimFnol
  evidence: EvidenceItem[]
  analysis?: ClaimAnalysis
  adjuster?: {
    notes?: string
    decision?: 'accepted' | 'rejected'
    decidedAt?: string
    overrideReason?: string
  }
  /** Settlement offer sent to the claimant (accept/contest via token link) */
  offer?: ClaimOffer
  /** DAAA digital — declaração amigável assinada pelos dois condutores */
  daa?: DaaForm
  audit: AuditEvent[]
}

// ── DAAA digital (DL 291/2007 art.35 — presunção se assinada por ambos) ────────
export interface DaaDriver {
  name?: string
  policyNumber?: string
  insurerName?: string
  plate?: string
  vehicleDesc?: string
  phone?: string
  circumstances?: string[] // 17 normalized DAAA items
  impactPoint?: string      // zone key on the vehicle top-view (front_left|front|…)
  signatureDataUrl?: string // canvas PNG — assinatura eletrónica simples (eIDAS)
}

export interface DaaForm {
  accidentDate?: string
  accidentTime?: string
  place?: string
  injuries?: boolean
  materialDamageOther?: boolean
  witnesses?: string
  pointsOfImpact?: string // descrição/esquema textual
  sketchDataUrl?: string    // croqui desenhado no canvas
  driverA?: DaaDriver       // segurado (veículo A)
  driverB?: DaaDriver       // outro condutor (veículo B)
  signedAt?: string
  /** true quando ambos assinaram → presunção legal art.35.3 */
  jointSigned?: boolean
}

// ── Settlement offer (RGPD/AI-Act: humano decide, IA apenas fundamenta) ───────
export type OfferStatus = 'sent' | 'accepted' | 'contested' | 'withdrawn'

export interface OfferLine {
  damageType: string // canonical taxonomy key (dent|scratch|…)
  location: string
  repairType?: string
  sizeEstimate?: string
  costMin: number
  costMax: number
}

export interface ClaimOffer {
  status: OfferStatus
  amountEur: number            // proposta final da seguradora
  lines: OfferLine[]           // breakdown por achado
  deductibleEur?: number       // franquia, se conhecida
  seniorApproval?: {           // limite de autoridade excedido
    required: boolean
    approvedBy?: string
    note?: string
    at?: string
  }
  sentAt: string
  respondedAt?: string
  contestReason?: string
}

export interface AuditEvent {
  at: string
  actor: 'system' | 'customer' | 'adjuster' | 'ai'
  action: string
  detail?: string
}

export interface EvidenceItem {
  id: string
  claimId: string
  kind: 'photo' | 'video' | 'frame'
  fileName: string
  mimeType: string
  sizeBytes: number
  sha256: string
  storageKey: string // path under data/uploads
  sourceVideoId?: string // for extracted frames
  frameTimeSec?: number
  /** Guided photo slot (CCC/ICBC standard): corner|damage_close|damage_wide|vin|odometer|plate|scene|other */
  slot?: string
  uploadedAt: string
  exif?: ExifSummary
  quality?: QualityFlags
  findings?: ImageFindings
  analysisError?: string
}

export interface ExifSummary {
  capturedAt?: string
  gpsLat?: number
  gpsLng?: number
  device?: string
  software?: string
  hasExif: boolean
}

export interface QualityFlags {
  isLikelyScreenshot: boolean
  noExif: boolean
  flags: string[]
}

// ---- AI contracts (JSON returned by the VLM) ----

export type Region =
  | 'upper-left' | 'upper-center' | 'upper-right'
  | 'middle-left' | 'center' | 'middle-right'
  | 'lower-left' | 'lower-center' | 'lower-right'

export type RepairType =
  | 'polish' | 'pdr' | 'repair_paint' | 'seal' | 'clean' | 'treat'
  | 'repair' | 'replace' | 'remediate' | 'monitor' | 'investigate'

export type WaterSource =
  | 'roof_leak' | 'plumbing' | 'rising_damp' | 'condensation'
  | 'penetrating' | 'flood' | 'unknown'

export interface DamageFinding {
  damageType: string // canonical key from taxonomy (dent|scratch|water_stain|mold|…)
  partKey?: string // canonical part/zone key (bumper_f|wall|roof_cover|…)
  location: string // PT label of the part/zone: "para-choques frontal", "teto da cozinha"
  region?: Region // 3×3 grid zone in the image
  severity: Severity
  confidence: number // 0..1
  description: string // PT
  sizeEstimate?: string // "≈15×8cm", "≈2 telhas", "≈3m²"
  preExisting?: boolean // signs of rust/old repair/mismatched paint → older damage
  repairType?: RepairType // polish|pdr|repair_paint|replace|remediate|investigate…
  repairAction?: string // what a repairer would do
  sourceHint?: WaterSource // for water-family damage
  estCostEur?: { min: number; max: number } // indicative PT band
  adjusted?: boolean // true when post-processing changed this finding
  validationNotes?: string[] // why confidence/severity/cost was adjusted
  bbox?: { nx: number; ny: number; nw: number; nh: number } // Normalized detector bbox 0..1 (x,y top-left) — drawn as overlay in UI
  polygon?: [number, number][] // Segmentation polygon [[nx,ny],…] normalized 0..1 — drawn as mask overlay
}

export interface ImageFindings {
  assetVisible: AssetType | 'none'
  coverageView?: string // which view this image covers ("frente","cozinha","telhado"…)
  isRealPhoto: boolean
  photoConcern?: string // drawing / ai-generated / stock-photo / unrelated
  imageQuality: 'good' | 'usable' | 'poor'
  qualityIssues: string[]
  lookalikes?: string[] // things that LOOK like damage but aren't (algae, shadows, old repair)
  findings: DamageFinding[]
  summary: string // PT, one sentence
  analyzedAt: string
  model: string
}

export interface FraudSignal {
  code:
    | 'exif_date_mismatch'
    | 'exif_gps_mismatch'
    | 'no_exif'
    | 'likely_screenshot'
    | 'not_a_photo'
    | 'duplicate_in_claim'
    | 'duplicate_cross_claim'
    | 'narrative_inconsistency'
    | 'possible_preexisting'
    | 'low_quality'
  weight: number // 0..1 contribution
  detail: string
}

export interface AnalysisProgress {
  done: number
  total: number
  current?: string // evidence fileName in flight
  phase: 'images' | 'aggregate' | 'done'
}

export interface ClaimAnalysis {
  startedAt: string
  completedAt?: string
  model: string
  imagesAnalyzed: number
  progress?: AnalysisProgress // live progress while status==='analyzing'
  coverageViews?: string[] // shot-list views seen across evidence
  preExistingCount?: number // findings flagged as likely pre-existing
  aggregatedFindings: DamageFinding[]
  overallSeverity: Severity | 'none'
  estCostEur: { min: number; max: number }
  consistencyCheck?: { consistent: boolean; notes: string }
  fraudSignals: FraudSignal[]
  fraudScore: number // 0..1
  triage: {
    verdict: TriageVerdict
    reasons: string[]
    recommendedAction: string
  }
  reportText: string // PT draft adjuster report
}
