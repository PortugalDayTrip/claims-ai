import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db } from '@/lib/db'
import type { DaaForm } from '@/lib/types'

type Ctx = { params: { token: string } }

// GET /api/c/[token]/daa — current DAAA state (prefill)
export async function GET(_req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })
  return NextResponse.json(claim.daa ?? {})
}

// POST /api/c/[token]/daa — save the digital friendly-accident statement.
// DL 291/2007 art.35.3: joint signatures create a legal presumption of the
// declared circumstances — so jointSigned is derived from BOTH signatures.
export async function POST(req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as DaaForm | null
  if (!body) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })
  if (!body.accidentDate || !body.place) {
    return NextResponse.json({ error: 'Data e local do acidente são obrigatórios' }, { status: 422 })
  }

  const jointSigned = !!(body.driverA?.signatureDataUrl && body.driverB?.signatureDataUrl)
  const daa: DaaForm = { ...body, jointSigned, signedAt: new Date().toISOString() }

  await db.updateClaim(claim.id, (c) => {
    c.daa = daa
    addAudit(
      c,
      'customer',
      'daa_submitted',
      jointSigned
        ? 'DAAA assinada por ambos os condutores — presunção art.35.3'
        : 'DAAA parcial (assinatura única)',
    )
  })

  return NextResponse.json({ ok: true, jointSigned })
}
