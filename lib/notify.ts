// Outbound notifications — pluggable transport, zero deps.
// SMTP/SendGrid integration point: set NOTIFY_TRANSPORT=smtp + SMTP_URL and swap
// transport below. Until then, every message is written to data/outbox/*.eml
// and logged to the claim audit trail (record-keeping requirement).

import { promises as fs } from 'fs'
import path from 'path'
import type { Claim } from './types'
import { addAudit } from './db'
import { customerLabel } from './status'

const OUTBOX = path.join(process.cwd(), 'data', 'outbox')

const FROM = process.env.MAIL_FROM ?? 'sinistros@seguradora.local'
const BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000'

export function claimLink(claim: Claim): string {
  return `${BASE_URL}/c/${claim.token}`
}

interface Email {
  to: string
  subject: string
  text: string
}

async function deliver(mail: Email): Promise<void> {
  await fs.mkdir(OUTBOX, { recursive: true })
  const name = `${Date.now()}_${mail.to.replace(/[^a-z0-9]/gi, '_')}.eml`
  await fs.writeFile(
    path.join(OUTBOX, name),
    `From: ${FROM}\nTo: ${mail.to}\nSubject: ${mail.subject}\nContent-Type: text/plain; charset=utf-8\n\n${mail.text}\n`,
    'utf8',
  )
}

/** Send + audit a claimant notification. Call AFTER claim is persisted. */
export async function notifyClaimant(claim: Claim, subject: string, text: string): Promise<void> {
  const to = claim.fnol.claimantEmail
  if (!to) return
  try {
    await deliver({ to, subject, text })
  } finally {
    // Record keeping: the notification itself is auditable (AI Act / ASF).
    await db_update_log(claim.id, `email:${subject}`, to)
  }
}

// small helper to keep notify.ts decoupled — addAudit needs the claim object,
// so we re-load and update (atomic-ish with the write queue).
async function db_update_log(claimId: string, action: string, detail?: string) {
  const { db } = await import('./db')
  await db.updateClaim(claimId, (c) => addAudit(c, 'system', 'notification', `${action} → ${detail}`))
}

// ── Templates (PT) ────────────────────────────────────────────────────────────

export function tplAcknowledgement(claim: Claim): { subject: string; text: string } {
  return {
    subject: `Recebemos a sua participação — sinistro ${claim.id}`,
    text: [
      `Olá ${claim.fnol.claimantName},`,
      ``,
      `Confirmamos a receção da sua participação de sinistro.`,
      `Número do sinistro: ${claim.id}`,
      claim.fnol.policyNumber ? `Apólice: ${claim.fnol.policyNumber}` : ``,
      ``,
      `Próximo passo: envie fotos ou um vídeo dos danos através da sua ligação pessoal:`,
      claimLink(claim),
      ``,
      `Pode acompanhar o estado do seu sinistro a qualquer momento nessa mesma ligação.`,
      ``,
      `Nota: a análise inicial dos danos é assistida por inteligência artificial;`,
      `a decisão final é sempre tomada e validada por um perito humano.`,
    ].join('\n'),
  }
}

export function tplStatusChanged(claim: Claim): { subject: string; text: string } {
  return {
    subject: `Atualização do seu sinistro ${claim.id}`,
    text: [
      `Olá ${claim.fnol.claimantName},`,
      ``,
      `O estado do seu sinistro foi atualizado para:`,
      `→ ${customerLabel(claim.status)}`,
      ``,
      `Acompanhe os próximos passos em: ${claimLink(claim)}`,
    ].join('\n'),
  }
}

export function tplOfferSent(claim: Claim): { subject: string; text: string } {
  const o = claim.offer!
  return {
    subject: `Proposta de indemnização — sinistro ${claim.id}`,
    text: [
      `Olá ${claim.fnol.claimantName},`,
      ``,
      `Apresentamos a nossa proposta de indemnização para o seu sinistro:`,
      ``,
      `   Valor proposto: €${o.amountEur.toLocaleString('pt-PT')}`,
      o.deductibleEur ? `   Franquia aplicável: €${o.deductibleEur.toLocaleString('pt-PT')}` : ``,
      ``,
      `Pode aceitar ou contestar esta proposta na sua área do sinistro:`,
      claimLink(claim),
      ``,
      `O detalhe dos danos considerados está disponível na mesma ligação.`,
    ].join('\n'),
  }
}
