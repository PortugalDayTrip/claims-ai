import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'
import { mimeForKey, readFile } from '@/lib/storage'

const BACKEND_URL = process.env.BACKEND_URL ?? ''
const BACKEND_KEY = process.env.BACKEND_KEY ?? ''

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

  // AWS backend: 302 to a signed URL — media bytes never cross this function
  // (saves serverless duration + bandwidth on videos/large photos).
  if (BACKEND_URL && BACKEND_KEY) {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const sig = crypto.createHmac('sha256', BACKEND_KEY).update(`${key}|${exp}`).digest('hex')
    return NextResponse.redirect(`${BACKEND_URL}/dl/${key}?sig=${sig}&exp=${exp}`, 302)
  }

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
