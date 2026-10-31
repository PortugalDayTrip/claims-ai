import { NextRequest, NextResponse } from 'next/server'
import { checkPin, createSession, sessionCookie } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string }
  if (!pin || !checkPin(pin)) {
    return NextResponse.json({ error: 'PIN inválido' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(sessionCookie.name, createSession(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(sessionCookie.name, '', { path: '/', maxAge: 0 })
  return res
}
