import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db, newId } from '@/lib/db'

type Ctx = { params: { token: string } }

const BACKEND_URL = process.env.BACKEND_URL ?? ''
const BACKEND_KEY = process.env.BACKEND_KEY ?? ''
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
  'image/heic': '.heic', 'image/heif': '.heif',
  'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
  'video/3gpp': '.3gp', 'video/x-msvideo': '.avi',
}

// POST /api/c/[token]/evidence-url — returns an HMAC-signed direct-to-backend
// upload URL for files too large for serverless multipart (>4.5 MB on Vercel).
// Body: { name, mime, slot? }
export async function POST(req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })
  if (!BACKEND_URL || !BACKEND_KEY) {
    return NextResponse.json({ error: 'Backend não configurado' }, { status: 503 })
  }
  const { name, mime } = (await req.json().catch(() => ({}))) as {
    name?: string
    mime?: string
  }
  const id = newId('ev')
  const ext = EXT_BY_MIME[mime ?? ''] ?? '.bin'
  const key = `${claim.id}/${id}${ext}`
  const exp = Math.floor(Date.now() / 1000) + 600 // 10 min
  const sig = crypto.createHmac('sha256', BACKEND_KEY).update(`${key}|${exp}`).digest('hex')
  return NextResponse.json({
    id,
    key,
    uploadUrl: `${BACKEND_URL}/up/${key}?sig=${sig}&exp=${exp}`,
    fileName: name ?? `upload${ext}`,
  })
}
