// Evidence storage — dual backend, same API:
// · Netlify deploy → Netlify Blobs (ephemeral FS can't persist uploads)
// · Local dev      → data/uploads/<claimId>/<file> on disk
// Originals are preserved byte-for-byte (evidence integrity).

import { promises as fs } from 'fs'
import path from 'path'

const UPLOADS = path.join(process.cwd(), 'data', 'uploads')
const ON_NETLIFY = process.env.NETLIFY === 'true' || !!process.env.NETLIFY_BLOBS_CONTEXT

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
  'video/3gpp': '.3gp',
}

export function isImage(mime: string): boolean {
  return mime.startsWith('image/')
}
export function isVideo(mime: string): boolean {
  return mime.startsWith('video/')
}

// ── Netlify Blobs backend ────────────────────────────────────────────────
// Lazy import so `next dev` never loads the SDK and stays zero-config.
async function blobStore() {
  const { getStore } = await import('@netlify/blobs')
  return getStore('uploads')
}

async function blobSet(key: string, buf: Buffer): Promise<void> {
  const store = await blobStore()
  // BlobInput = string | ArrayBuffer | Blob — slice out the exact bytes
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  await store.set(key, ab)
}

async function blobGet(key: string): Promise<Buffer | null> {
  try {
    const store = await blobStore()
    const data = await store.get(key, { type: 'arrayBuffer' })
    return data ? Buffer.from(data) : null
  } catch {
    return null
  }
}

// ── Local disk backend ───────────────────────────────────────────────────
async function diskSet(key: string, buf: Buffer): Promise<void> {
  const p = path.join(UPLOADS, key)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, buf)
}

async function diskGet(key: string): Promise<Buffer | null> {
  try {
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '')
    return await fs.readFile(path.join(UPLOADS, safe))
  } catch {
    return null
  }
}

// ── Public API (unchanged signatures) ────────────────────────────────────
export async function saveFile(claimId: string, fileId: string, buf: Buffer, mime: string): Promise<string> {
  const ext = EXT_BY_MIME[mime] ?? path.extname(mime.split('/')[1] ?? '') ?? '.bin'
  const key = `${claimId}/${fileId}${ext}`
  if (ON_NETLIFY) await blobSet(key, buf)
  else await diskSet(key, buf)
  return key
}

export async function saveFrame(claimId: string, fileId: string, buf: Buffer): Promise<string> {
  const key = `${claimId}/${fileId}.jpg`
  if (ON_NETLIFY) await blobSet(key, buf)
  else await diskSet(key, buf)
  return key
}

export async function readFile(key: string): Promise<Buffer | null> {
  // Prevent path traversal (applies to both backends)
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '')
  if (ON_NETLIFY) return blobGet(safe)
  return diskGet(safe)
}

export function mimeForKey(key: string): string {
  const ext = path.extname(key).toLowerCase()
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.3gp': 'video/3gpp',
    '.avi': 'video/x-msvideo',
  }
  return map[ext] ?? 'application/octet-stream'
}
