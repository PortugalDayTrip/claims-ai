import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { notifyClaimant, tplStatusChanged } from '@/lib/notify'

type Ctx = { params: { id: string } }

// GET /api/claims/[id] — full claim (adjuster)
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const claim = await db.getClaim(params.id)
  if (!claim) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })
  return NextResponse.json(claim)
}

// PATCH /api/claims/[id] — adjuster updates: status, notes, decision
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as {
    status?: string
    notes?: string
    decision?: 'accepted' | 'rejected'
    overrideReason?: string
  }
  const claim = await db.updateClaim(params.id, (c) => {
    if (body.status) {
      c.status = body.status as typeof c.status
      addAudit(c, 'adjuster', 'status_changed', body.status)
    }
    if (body.notes !== undefined) {
      c.adjuster = { ...c.adjuster, notes: body.notes }
    }
    if (body.decision) {
      c.adjuster = {
        ...c.adjuster,
        decision: body.decision,
        decidedAt: new Date().toISOString(),
        overrideReason: body.overrideReason,
      }
      c.status = body.decision === 'accepted' ? 'approved' : 'rejected'
      addAudit(c, 'adjuster', 'decision', `${body.decision}${body.overrideReason ? ` — ${body.overrideReason}` : ''}`)
    }
  })
  if (!claim) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })
  // Notify the claimant on externally-visible milestones only (best practice:
  // proactive updates; internal noise like 'analyzing' stays out of the inbox)
  if (['approved', 'rejected', 'closed'].includes(claim.status)) {
    const tpl = tplStatusChanged(claim)
    await notifyClaimant(claim, tpl.subject, tpl.text).catch(() => undefined)
  }
  return NextResponse.json({ ok: true, status: claim.status })
}
