import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { notifyClaimant, tplAcknowledgement } from '@/lib/notify'
import type { AssetType } from '@/lib/types'

// GET /api/claims — adjuster list (summary fields only)
export async function GET() {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const claims = await db.listClaims()
  return NextResponse.json(
    claims.map((c) => ({
      id: c.id,
      token: c.token,
      createdAt: c.createdAt,
      status: c.status,
      claimantName: c.fnol.claimantName,
      assetType: c.fnol.assetType,
      incidentType: c.fnol.incidentType,
      evidenceCount: c.evidence.length,
      severity: c.analysis?.overallSeverity,
      fraudScore: c.analysis?.fraudScore,
      triage: c.analysis?.triage.verdict,
      estCost: c.analysis?.estCostEur,
    })),
  )
}

// POST /api/claims — create claim, returns customer upload link
export async function POST(req: NextRequest) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as {
    claimantName?: string
    claimantEmail?: string
    claimantPhone?: string
    policyNumber?: string
    assetType?: AssetType
    assetDescription?: string
    incidentDate?: string
    incidentLocation?: string
    incidentType?: string
  }
  if (!body.claimantName || !body.assetType) {
    return NextResponse.json({ error: 'claimantName e assetType são obrigatórios' }, { status: 400 })
  }
  const claim = await db.createClaim({
    status: 'awaiting_evidence',
    fnol: {
      claimantName: body.claimantName,
      claimantEmail: body.claimantEmail ?? '',
      claimantPhone: body.claimantPhone,
      policyNumber: body.policyNumber,
      assetType: body.assetType,
      assetDescription: body.assetDescription,
      incidentDate: body.incidentDate,
      incidentLocation: body.incidentLocation,
      incidentType: body.incidentType,
    },
    evidence: [],
  })
  await db.updateClaim(claim.id, (c) => addAudit(c, 'adjuster', 'claim_created', 'via painel do perito'))
  // Acknowledgement email (best-practice: <10s after FNOL) — non-blocking failures
  const fresh = await db.getClaim(claim.id)
  if (fresh) {
    const tpl = tplAcknowledgement(fresh)
    await notifyClaimant(fresh, tpl.subject, tpl.text).catch(() => undefined)
  }
  return NextResponse.json({ id: claim.id, token: claim.token, url: `/c/${claim.token}` })
}
