// Customer-facing status mapping (PT) + SLA targets.
// The adjuster sees raw ClaimStatus; the claimant sees friendly language
// mapped from the same status (best-practice: hide internal jargon).

import type { ClaimStatus } from './types'

export interface StatusStep {
  key: string
  label: string      // linguagem cliente
  detail: string
}

/** Linear customer timeline — the 4 milestones every claimant understands. */
export const CUSTOMER_STEPS: StatusStep[] = [
  { key: 'received',  label: 'Pedido recebido',        detail: 'A sua participação foi registada e atribuída um número.' },
  { key: 'evidence',  label: 'Fotos recebidas',        detail: 'Recebemos as suas fotos/vídeo dos danos.' },
  { key: 'review',    label: 'Em análise pelo perito', detail: 'A nossa IA analisou os danos; um perito está a validar o resultado.' },
  { key: 'decision',  label: 'Decisão',                detail: 'Parecer final do perito sobre o seu sinistro.' },
]

/** Which timeline step index the claim currently sits at (0-3). */
export function stepIndex(status: ClaimStatus): number {
  switch (status) {
    case 'awaiting_evidence':                      return 0
    case 'evidence_received':
    case 'analyzing':                              return 1
    case 'analyzed':
    case 'in_review':                              return 2
    case 'approved':
    case 'rejected':
    case 'closed':                                 return 3
  }
}

export function customerLabel(status: ClaimStatus): string {
  switch (status) {
    case 'awaiting_evidence':   return 'A aguardar as suas fotos'
    case 'evidence_received':   return 'Fotos recebidas — a preparar análise'
    case 'analyzing':           return 'Análise automática em curso'
    case 'analyzed':            return 'Análise concluída — aguarda perito'
    case 'in_review':           return 'Em avaliação pelo perito'
    case 'approved':            return 'Aprovado'
    case 'rejected':            return 'Decisão registada'
    case 'closed':              return 'Encerrado'
  }
}

export function nextStep(status: ClaimStatus): string {
  switch (status) {
    case 'awaiting_evidence':   return 'Envie fotos ou vídeo dos danos abaixo.'
    case 'evidence_received':   return 'Vai receber a análise automática em instantes.'
    case 'analyzing':           return 'A IA está a analisar as suas fotos — normalmente <1 minuto por foto.'
    case 'analyzed':            return 'Um perito irá validar a análise e contactá-lo.'
    case 'in_review':           return 'O perito está a avaliar. Não precisa fazer nada; avisamos se faltar informação.'
    case 'approved':            return 'O seu sinistro foi aprovado — a seguradora avança com a regularização.'
    case 'rejected':            return 'Consulte o parecer do perito — pode apresentar mais prova se necessário.'
    case 'closed':              return 'Processo encerrado.'
  }
}

// ── SLA targets (ASF supervision: response times are audited) ─────────────────
// Hours the claim may stay in each status before it is flagged as overdue.
export const SLA_HOURS: Partial<Record<ClaimStatus, number>> = {
  awaiting_evidence: 72,
  evidence_received: 4,
  analyzing: 1,
  analyzed: 24,
  in_review: 48,
  approved: 72,    // time to send offer
}

export interface SlaState {
  ageHours: number
  limitHours?: number
  overdue: boolean
}

export function slaFor(status: ClaimStatus, updatedAt: string): SlaState {
  const ageHours = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000
  const limitHours = SLA_HOURS[status]
  return { ageHours, limitHours, overdue: limitHours !== undefined && ageHours > limitHours }
}

/** Adjuster authority limit — approvals/offers above this need senior sign-off. */
export const SENIOR_APPROVAL_EUR = Number(
  process.env.NEXT_PUBLIC_SENIOR_APPROVAL_EUR ?? process.env.SENIOR_APPROVAL_EUR ?? 10_000,
)
