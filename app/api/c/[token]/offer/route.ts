import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'

type Ctx = { params: { token: string } }

// POST /api/c/[token]/offer — claimant responds to a settlement offer.
// { action: 'accept' | 'contest', reason?: string }
// RGPD art.22 safeguard: contestação re-encaminha sempre para revisão humana.
export async function POST(req: NextRequest, { params }: Ctx) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; reason?: string }
  if (body.action !== 'accept' && body.action !== 'contest') {
    return NextResponse.json({ error: 'Ação inválida (accept|contest)' }, { status: 400 })
  }
  if (body.action === 'contest' && !body.reason?.trim()) {
    return NextResponse.json({ error: 'Indique o motivo da contestação' }, { status: 400 })
  }

  const updated = await db.updateClaim(
    (await db.getClaimByToken(params.token))?.id ?? '',
    (c) => {
      if (!c.offer || c.offer.status !== 'sent') throw new Error('NO_OFFER')
      c.offer.status = body.action === 'accept' ? 'accepted' : 'contested'
      c.offer.respondedAt = new Date().toISOString()
      c.offer.contestReason = body.reason?.trim()
      if (body.action === 'accept') {
        c.status = 'approved'
        addAudit(c, 'customer', 'offer_accepted', `€${c.offer.amountEur}`)
      } else {
        c.status = 'in_review'
        addAudit(c, 'customer', 'offer_contested', body.reason!.trim())
      }
    },
  ).catch((e: Error) => {
    if (e.message === 'NO_OFFER') return null
    throw e
  })

  if (!updated) return NextResponse.json({ error: 'Sem proposta ativa' }, { status: 400 })
  return NextResponse.json({ ok: true, status: updated.offer!.status })
}
