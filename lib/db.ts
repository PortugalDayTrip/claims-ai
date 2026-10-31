// Minimal JSON-file repository — zero-dependency, atomic-ish writes.
// Swap for Prisma/Postgres in production (interface kept narrow on purpose).

import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { AuditEvent, Claim } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'claims.json')
const ON_NETLIFY = process.env.NETLIFY === 'true' || !!process.env.NETLIFY_BLOBS_CONTEXT

interface DbShape {
  claims: Claim[]
}

let cache: DbShape | null = null
let writeQueue: Promise<unknown> = Promise.resolve()

// Netlify: claims.json lives in a blob store (serverless FS is ephemeral).
async function blobDb() {
  const { getStore } = await import('@netlify/blobs')
  return getStore('claims-db')
}

async function load(): Promise<DbShape> {
  if (cache) return cache
  if (ON_NETLIFY) {
    try {
      const store = await blobDb()
      cache = (await store.get('claims', { type: 'json' })) as DbShape | null
    } catch {
      cache = null
    }
    cache ??= { claims: [] }
    return cache
  }
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8')
    cache = JSON.parse(raw) as DbShape
  } catch {
    cache = { claims: [] }
  }
  return cache!
}

async function persist(): Promise<void> {
  if (ON_NETLIFY) {
    const store = await blobDb()
    await store.setJSON('claims', cache)
    return
  }
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = DB_FILE + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(cache, null, 2), 'utf8')
  await fs.rename(tmp, DB_FILE)
}

function enqueue<T>(fn: () => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(fn)
  writeQueue = run.then(() => undefined, () => undefined)
  return run
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

export function newToken(): string {
  return crypto.randomBytes(20).toString('base64url')
}

export async function sha256(buf: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export function addAudit(claim: Claim, actor: AuditEvent['actor'], action: string, detail?: string) {
  claim.audit.push({ at: new Date().toISOString(), actor, action, detail })
}

export const db = {
  async listClaims(): Promise<Claim[]> {
    const d = await load()
    return [...d.claims].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async getClaim(id: string): Promise<Claim | null> {
    const d = await load()
    return d.claims.find((c) => c.id === id) ?? null
  },

  async getClaimByToken(token: string): Promise<Claim | null> {
    const d = await load()
    return d.claims.find((c) => c.token === token) ?? null
  },

  async findByHash(sha256: string): Promise<{ claimId: string; evidenceId: string }[]> {
    const d = await load()
    const hits: { claimId: string; evidenceId: string }[] = []
    for (const c of d.claims)
      for (const e of c.evidence) if (e.sha256 === sha256) hits.push({ claimId: c.id, evidenceId: e.id })
    return hits
  },

  async createClaim(partial: Omit<Claim, 'id' | 'token' | 'createdAt' | 'updatedAt' | 'audit'>): Promise<Claim> {
    return enqueue(async () => {
      const d = await load()
      const now = new Date().toISOString()
      const claim: Claim = {
        ...partial,
        id: newId('clm'),
        token: newToken(),
        createdAt: now,
        updatedAt: now,
        audit: [],
      }
      addAudit(claim, 'system', 'claim_created')
      d.claims.push(claim)
      await persist()
      return claim
    })
  },

  async updateClaim(id: string, mutate: (claim: Claim) => void | Promise<void>): Promise<Claim | null> {
    return enqueue(async () => {
      const d = await load()
      const claim = d.claims.find((c) => c.id === id)
      if (!claim) return null
      await mutate(claim)
      claim.updatedAt = new Date().toISOString()
      await persist()
      return claim
    })
  },
}
