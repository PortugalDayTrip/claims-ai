import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { notifyClaimant, tplOfferSent } from '@/lib/notify'
import { SENIOR_APPROVAL_EUR } from '@/lib/status'
import type { ClaimOffer } from '@/lib/types'

type Ctx = { params: { id: string } }

// POST /api/claims/[id]/offer — adjuster sends settlement offer to claimant.
// Authority limit: amounts > SENIOR_APPROVAL_EUR require seniorApprovedBy + note.
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    amountEur?: number
    deductibleEur?: number
    seniorApprovedBy?: string
    seniorNote?: string
  }

  const claim = await db.getClaim(params.id)
  if (!claim) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })
  if (!claim.analysis) return NextResponse.json({ error: 'Analise o sinistro antes de propor indemnização' }, { status: 400 })

  const est = claim.analysis.estCostEur
  const amount = body.amountEur ?? Math.round((est.min + est.max) / 2)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Valor de indemnização inválido' }, { status: 400 })
  }

  // ── Authority limits: propostas acima do limite exigem aprovação sénior
  const needsSenior = amount > SENIOR_APPROVAL_EUR
  if (needsSenior && (!body.seniorApprovedBy || !body.seniorNote)) {
    return NextResponse.json({
      error: `Acima de €${SENIOR_APPROVAL_EUR.toLocaleString('pt-PT')} requer aprovador sénior + nota de justificação`,
      requiresSeniorApproval: true,
    }, { status: 422 })
  }

  const offer: ClaimOffer = {
    status: 'sent',
    amountEur: amount,
    deductibleEur: body.deductibleEur,
    lines: claim.analysis.aggregatedFindings.map((f) => ({
      damageType: f.damageType,
      location: f.location,
      repairType: f.repairType,
      sizeEstimate: f.sizeEstimate,
      costMin: f.estCostEur?.min ?? 0,
      costMax: f.estCostEur?.max ?? 0,
    })),
    seniorApproval: needsSenior
      ? { required: true, approvedBy: body.seniorApprovedBy, note: body.seniorNote, at: new Date().toISOString() }
      : undefined,
    sentAt: new Date().toISOString(),
  }

  const updated = await db.updateClaim(params.id, (c) => {
    c.offer = offer
    c.status = 'in_review'
    addAudit(c, 'adjuster', 'offer_sent',
      `€${amount}${needsSenior ? ` (sénior: ${body.seniorApprovedBy} — ${body.seniorNote})` : ''}`)
  })
  if (!updated) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })

  const tpl = tplOfferSent(updated)
  await notifyClaimant(updated, tpl.subject, tpl.text)

  return NextResponse.json({ ok: true, offer })
}
