// Minimal adjuster session — signed cookie with HMAC.
// ADJUSTER_PIN + SESSION_SECRET env vars. Swap for SSO/NextAuth in production.

import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'adjuster_session'
const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me'
const TTL_MS = 1000 * 60 * 60 * 12 // 12h

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createSession(): string {
  const exp = Date.now() + TTL_MS
  const payload = `adjuster.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifySession(value: string | undefined): boolean {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [role, exp, sig] = parts
  if (role !== 'adjuster') return false
  const expected = sign(`${role}.${exp}`)
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  return Number(exp) > Date.now()
}

export function checkPin(pin: string): boolean {
  const expected = process.env.ADJUSTER_PIN ?? '1234'
  const a = Buffer.from(pin.padEnd(64, '\0'))
  const b = Buffer.from(expected.padEnd(64, '\0'))
  return crypto.timingSafeEqual(a, b)
}

export function isAdjuster(): boolean {
  return verifySession(cookies().get(COOKIE)?.value)
}

export const sessionCookie = { name: COOKIE }
