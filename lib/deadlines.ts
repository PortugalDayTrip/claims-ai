// Legal deadline engine — DL 291/2007 art.36 (auto) + ASF Rec. 2/2025 (MR habitação).
// Pure functions: deadlines are derived from claim.createdAt, not stored.

import type { Claim } from './types'

// PT national holidays 2026–2027 (municipal holidays configurable per insurer).
const PT_HOLIDAYS = new Set([
  '2026-01-01', '2026-04-03', '2026-04-05', '2026-04-25', '2026-05-01',
  '2026-06-04', '2026-06-10', '2026-08-15', '2026-10-05', '2026-11-01',
  '2026-12-01', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-03-28', '2027-04-25', '2027-05-01',
  '2027-05-27', '2027-06-10', '2027-08-15', '2027-10-05', '2027-11-01',
  '2027-12-01', '2027-12-08', '2027-12-25',
])

function isBusinessDay(d: Date): boolean {
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return false
  return !PT_HOLIDAYS.has(d.toISOString().slice(0, 10))
}

/** Add n business days (dias úteis) to a date. */
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < n) {
    d.setDate(d.getDate() + 1)
    if (isBusinessDay(d)) added++
  }
  return d
}

export interface Deadline {
  key: string
  label: string
  legalBasis: string
  dueAt: string // ISO
  businessDaysFromStart: number
  /** true when this milestone's clock may legally pause (fraud investigation etc.) */
  suspendable: boolean
}

export interface DeadlineStatus extends Deadline {
  doneAt?: string
  breached: boolean
  daysLeft: number // business days until due (negative = overdue)
  state: 'done' | 'on_track' | 'at_risk' | 'breached'
}

/**
 * Legal milestones for a claim, derived from createdAt.
 * Auto (DL 291/2007 art.36): first contact ≤2bd; expertise ≤8bd (+12 w/ dismantling)
 * after the first-contact window; reports ≤4bd; decision ≤30bd after first contact.
 * MR habitação (ASF Rec.2/2025): contact ≤4bd; decision ≤25bd building / ≤40bd contents.
 */
export function deadlinesFor(claim: Claim): Deadline[] {
  const t0 = new Date(claim.createdAt)
  const isVehicle = claim.fnol.assetType === 'vehicle'
  const list: Deadline[] = []

  if (isVehicle) {
    const fc = addBusinessDays(t0, 2)
    const expert = addBusinessDays(fc, 8)
    const expertDismantle = addBusinessDays(fc, 12)
    list.push(
      { key: 'first_contact', label: '1.º contacto / marcação de peritagem', legalBasis: 'DL 291/2007 art.36.1.a', dueAt: fc.toISOString(), businessDaysFromStart: 2, suspendable: true },
      { key: 'expertise', label: 'Peritagens concluídas', legalBasis: 'DL 291/2007 art.36.1.b', dueAt: expert.toISOString(), businessDaysFromStart: 0, suspendable: true },
      { key: 'expertise_dismantle', label: 'Peritagens c/ desmontagem', legalBasis: 'DL 291/2007 art.36.1.c', dueAt: expertDismantle.toISOString(), businessDaysFromStart: 0, suspendable: true },
      { key: 'expertise_report', label: 'Relatórios de peritagem disponibilizados', legalBasis: 'DL 291/2007 art.36.1.d', dueAt: addBusinessDays(expert, 4).toISOString(), businessDaysFromStart: 0, suspendable: false },
      { key: 'decision', label: 'Comunicação assunção/não-assunção (escrita)', legalBasis: 'DL 291/2007 art.36.1.e', dueAt: addBusinessDays(fc, 30).toISOString(), businessDaysFromStart: 0, suspendable: false },
    )
  } else {
    // Multi-risk home — ASF Recommendation 2/2025 (adhesion monitored, publishable)
    const both = claim.fnol.incidentType?.toLowerCase().includes('conteúdo') === false
    const decisionBd = both ? 40 : 25
    list.push(
      { key: 'first_contact', label: '1.º contacto (peritagem/sequência)', legalBasis: 'ASF Rec. 2/2025 a)', dueAt: addBusinessDays(t0, 4).toISOString(), businessDaysFromStart: 4, suspendable: true },
      { key: 'decision', label: `Decisão de responsabilidade (${decisionBd}d úteis)`, legalBasis: 'ASF Rec. 2/2025 b)', dueAt: addBusinessDays(t0, decisionBd).toISOString(), businessDaysFromStart: decisionBd, suspendable: true },
    )
  }
  return list
}

function businessDaysBetween(a: Date, b: Date): number {
  const sign = b >= a ? 1 : -1
  const [lo, hi] = sign > 0 ? [a, b] : [b, a]
  const d = new Date(lo)
  let n = 0
  while (d < hi) {
    d.setDate(d.getDate() + 1)
    if (d <= hi && isBusinessDay(d)) n++
  }
  return n * sign
}

/** Map milestone keys to claim events that satisfy them. */
function doneAtFor(claim: Claim, key: string): string | undefined {
  const ev = claim.audit.find((e) =>
    (key === 'first_contact' && e.action === 'first_contact_made') ||
    (key === 'expertise' && e.action === 'expertise_done') ||
    (key === 'expertise_report' && e.action === 'expertise_report_shared') ||
    (key === 'decision' && (e.action === 'decision_made' || e.action === 'decision' || e.action === 'offer_sent')),
  )
  return ev?.at
}

export function deadlineStatus(claim: Claim, now = new Date()): DeadlineStatus[] {
  return deadlinesFor(claim).map((d) => {
    const due = new Date(d.dueAt)
    const doneAt = doneAtFor(claim, d.key)
    const breached = doneAt ? new Date(doneAt) > due : now > due
    const daysLeft = businessDaysBetween(now, due)
    return {
      ...d,
      doneAt,
      breached,
      daysLeft,
      state: doneAt ? 'done' : breached ? 'breached' : daysLeft <= 2 ? 'at_risk' : 'on_track',
    }
  })
}

/** Worst open deadline — for list/SLA display. */
export function nextDeadline(claim: Claim, now = new Date()): DeadlineStatus | null {
  const open = deadlineStatus(claim, now).filter((d) => d.state !== 'done')
  return open.sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0] ?? null
}
