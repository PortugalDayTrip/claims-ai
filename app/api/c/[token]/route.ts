import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'

type Ctx = { params: { token: string } }

// GET /api/c/[token] — public claim info for the customer wizard
export async function GET(_req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida ou expirada' }, { status: 404 })
  return NextResponse.json({
    id: claim.id,
    status: claim.status,
    fnol: claim.fnol,
    evidenceCount: claim.evidence.length,
    evidence: claim.evidence.map((e) => ({
      id: e.id,
      kind: e.kind,
      fileName: e.fileName,
      frameTimeSec: e.frameTimeSec,
    })),
    // Settlement offer, if sent — the claimant may accept or contest it.
    offer: claim.offer
      ? {
          status: claim.offer.status,
          amountEur: claim.offer.amountEur,
          deductibleEur: claim.offer.deductibleEur,
          lines: claim.offer.lines,
          sentAt: claim.offer.sentAt,
          respondedAt: claim.offer.respondedAt,
          contestReason: claim.offer.contestReason,
        }
      : undefined,
  })
}

// POST /api/c/[token] — customer actions (RGPD art. 22: request human review)
export async function POST(req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { action?: string; note?: string }

  if (body.action !== 'request_review') {
    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
  }

  const already = claim.audit.some((e) => e.action === 'human_review_requested')
  await db.updateClaim(claim.id, (c) => {
    addAudit(
      c,
      'customer',
      'human_review_requested',
      body.note?.slice(0, 300) || 'pedido de revisão humana (RGPD art. 22)',
    )
    // Surface to the adjuster queue: an open review request keeps the claim in review
    if (['analyzed', 'approved', 'rejected'].includes(c.status)) {
      c.status = 'in_review'
    }
  })
  return NextResponse.json({ ok: true, already })
}

// PATCH /api/c/[token] — customer completes the guided FNOL intake
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as Partial<typeof claim.fnol>
  await db.updateClaim(claim.id, (c) => {
    c.fnol = { ...c.fnol, ...body, claimantName: c.fnol.claimantName, claimantEmail: c.fnol.claimantEmail }
    addAudit(c, 'customer', 'fnol_updated')
    // Coverage sanity flags (coverage verification starts at intake — Salesforce
    // model: verify policy in force on the loss date, flag anomalies early)
    if (body.injuries) addAudit(c, 'system', 'priority_flag', 'sinal de lesões reportado no FNOL')
    const d = body.incidentDate ? new Date(body.incidentDate) : null
    if (d) {
      const now = Date.now()
      if (d.getTime() > now + 86400_000)
        addAudit(c, 'system', 'coverage_warning', 'data do sinistro no futuro — verificar')
      else if (now - d.getTime() > 60 * 86400_000)
        addAudit(c, 'system', 'coverage_warning', `sinistro com >60 dias (${body.incidentDate}) — confirmar cobertura em vigor na data`)
    }
  })
  return NextResponse.json({ ok: true })
}
