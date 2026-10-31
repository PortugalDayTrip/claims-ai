import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'
import { notifyClaimant, tplAcknowledgement } from '@/lib/notify'
import type { AssetType } from '@/lib/types'

// POST /api/fnol — SELF-SERVICE claim creation by the claimant (no adjuster
// session). The customer starts the process; the adjuster sees it in the queue.
// Salesforce model: same governed claim structure whether intake comes from the
// self-service portal or the agent console.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    claimantName?: string
    claimantEmail?: string
    claimantPhone?: string
    policyNumber?: string
    assetType?: AssetType
    assetDescription?: string
    incidentDate?: string
    incidentLocation?: string
    incidentLat?: number
    incidentLng?: number
    incidentType?: string
    narrative?: string
    declarationAccepted?: boolean
  }

  if (!body.claimantName || !body.claimantEmail || !body.assetType) {
    return NextResponse.json(
      { error: 'Nome, email e tipo de bem são obrigatórios' },
      { status: 400 },
    )
  }
  if (!/^\S+@\S+\.\S+$/.test(body.claimantEmail)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const claim = await db.createClaim({
    status: 'awaiting_evidence',
    fnol: {
      claimantName: body.claimantName,
      claimantEmail: body.claimantEmail,
      claimantPhone: body.claimantPhone,
      policyNumber: body.policyNumber,
      assetType: body.assetType,
      assetDescription: body.assetDescription,
      incidentDate: body.incidentDate,
      incidentLocation: body.incidentLocation,
      incidentLat: body.incidentLat,
      incidentLng: body.incidentLng,
      incidentType: body.incidentType,
      narrative: body.narrative,
      declarationAccepted: body.declarationAccepted,
      declarationAt: body.declarationAccepted ? new Date().toISOString() : undefined,
    },
    evidence: [],
  })

  await db.updateClaim(claim.id, (c) =>
    addAudit(c, 'customer', 'claim_created', 'canal digital self-service'),
  )

  // Acknowledgement <10s — email with the personal tracking link
  const fresh = await db.getClaim(claim.id)
  if (fresh) {
    const tpl = tplAcknowledgement(fresh)
    await notifyClaimant(fresh, tpl.subject, tpl.text).catch(() => undefined)
  }

  return NextResponse.json({ id: claim.id, token: claim.token, url: `/c/${claim.token}` })
}
