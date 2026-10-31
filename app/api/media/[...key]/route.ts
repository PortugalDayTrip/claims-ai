import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { mimeForKey, readFile } from '@/lib/storage'

// GET /api/media/<claimId>/<file>?token=<customerToken>
// Access: adjuster session OR valid customer token for that claim.
export async function GET(req: NextRequest, { params }: { params: { key: string[] } }) {
  const key = params.key.map((s) => decodeURIComponent(s)).join('/')
  const claimId = key.split('/')[0]
  const token = req.nextUrl.searchParams.get('token')

  let allowed = isAdjuster()
  if (!allowed && token) {
    const claim = await db.getClaimByToken(token)
    allowed = !!claim && claim.id === claimId
  }
  if (!allowed) return NextResponse.json({ error: 'Acesso negado' }, { status: 401 })

  const buf = await readFile(key)
  if (!buf) return NextResponse.json({ error: 'Ficheiro não encontrado' }, { status: 404 })

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': mimeForKey(key),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
