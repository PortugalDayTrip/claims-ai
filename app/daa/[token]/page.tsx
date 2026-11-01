import DaaWizard from '@/components/daa-wizard'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DaaPage({ params }: { params: { token: string } }) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Declaração Amigável de Acidente</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sinistro {claim.id} · {claim.fnol.claimantName} — preencha com o outro condutor.
        Se ambos assinarem, as circunstâncias declaradas presumem-se verdadeiras (DL 291/2007, art. 35.º).
      </p>
      <DaaWizard
        token={params.token}
        claimId={claim.id}
        claimantName={claim.fnol.claimantName}
        policyNumber={claim.fnol.policyNumber ?? ''}
        vehicleDesc={claim.fnol.assetDescription ?? ''}
        existing={claim.daa}
      />
    </div>
  )
}
