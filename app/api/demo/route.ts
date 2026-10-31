import { addAudit, db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/demo — create a seeded claim for trying the customer flow.
// Demo-only convenience; disable in production with DEMO_MODE=0.
export async function POST() {
  if (process.env.DEMO_MODE === '0') {
    return NextResponse.json({ error: 'demo desativado' }, { status: 403 })
  }

  const demos = [
    {
      claimantName: 'Joana Silva',
      claimantEmail: 'joana.silva@example.pt',
      claimantPhone: '+351 91 234 5678',
      policyNumber: 'AUTO-2026-0142',
      assetType: 'vehicle' as const,
      assetDescription: 'Volkswagen Golf 1.6 TDI 2019, cinzento',
      incidentDate: '2026-10-28',
      incidentLocation: 'A2, saída Setúbal',
      incidentType: 'Colisão',
    },
    {
      claimantName: 'Miguel Torres',
      claimantEmail: 'miguel.torres@example.pt',
      claimantPhone: '+351 93 876 5432',
      policyNumber: 'HAB-2025-0871',
      assetType: 'property' as const,
      assetDescription: 'Moradia T3 em Cascais',
      incidentDate: '2026-10-25',
      incidentLocation: 'Cascais',
      incidentType: 'Rotura/fuga de água',
    },
  ]
  const pick = demos[Math.floor(Math.random() * demos.length)]

  const claim = await db.createClaim({
    status: 'awaiting_evidence',
    fnol: pick,
    evidence: [],
  })
  await db.updateClaim(claim.id, (c) => {
    addAudit(c, 'system', 'demo_claim_created')
  })

  return NextResponse.json({ id: claim.id, token: claim.token, url: `/c/${claim.token}` })
}
