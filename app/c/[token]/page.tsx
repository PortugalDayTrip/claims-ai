import CustomerPortal from '@/components/customer-portal'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CustomerPage({ params }: { params: { token: string } }) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) notFound()

  return (
    <div>
      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="text-2xl font-bold">O meu sinistro</h1>
        <p className="mt-1 text-sm text-slate-500">
          Olá {claim.fnol.claimantName} — acompanhe aqui o estado do seu pedido
          e envie fotos dos danos.
        </p>
      </div>
      <CustomerPortal token={params.token} claim={claim} />
    </div>
  )
}
