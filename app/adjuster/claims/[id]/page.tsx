import ClaimDetail from '@/components/claim-detail'
import { db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ClaimDetailPage({ params }: { params: { id: string } }) {
  if (!isAdjuster()) redirect('/adjuster/login')
  const claim = await db.getClaim(params.id)
  if (!claim) notFound()
  return <ClaimDetail initial={claim} />
}
