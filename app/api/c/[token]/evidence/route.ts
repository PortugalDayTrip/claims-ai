import { NextRequest, NextResponse } from 'next/server'
import { addAudit, db, newId, sha256 } from '@/lib/db'
import { extractExif, qualityFlags } from '@/lib/fraud'
import { isImage, isVideo, mimeForKey, saveFile, saveFrame } from '@/lib/storage'
import type { EvidenceItem } from '@/lib/types'

type Ctx = { params: { token: string } }

const MAX_MB = Number(process.env.MAX_UPLOAD_MB ?? 200)

// POST /api/c/[token]/evidence — multipart upload.
// Fields: "files" (originals) + optional "frame::<videoFileName>::<sec>" (client-extracted JPEGs)
export async function POST(req: NextRequest, { params }: Ctx) {
  const claim = await db.getClaimByToken(params.token)
  if (!claim) return NextResponse.json({ error: 'Ligação inválida' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 })

  const saved: EvidenceItem[] = []
  const errors: string[] = []

  for (const [field, value] of form.entries()) {
    // "remote" fields: {id,key,name,mime,size,sha256,slot?} for files the browser
    // already PUT directly to the AWS backend via signed URL (>4.5MB).
    if (field === 'remote' && typeof value === 'string') {
      try {
        const r = JSON.parse(value) as {
          id: string; key: string; name: string; mime: string
          size: number; sha256: string; slot?: string
        }
        if (!r.key.startsWith(`${claim.id}/`)) continue
        saved.push({
          id: r.id,
          claimId: claim.id,
          kind: isVideo(r.mime) ? 'video' : 'photo',
          fileName: r.name,
          mimeType: r.mime,
          sizeBytes: r.size,
          slot: r.slot,
          sha256: r.sha256,
          storageKey: r.key,
          uploadedAt: new Date().toISOString(),
        })
      } catch {
        errors.push('remote: metadados inválidos')
      }
      continue
    }
    if (!(value instanceof File)) continue
    const isFrameField = field.startsWith('frame::')
    // Guided photo slots: "file::<slot>" → the photo serves a checklist slot
    const slot = field.startsWith('file::') ? field.slice(6) : undefined
    const buf = Buffer.from(await value.arrayBuffer())
    if (buf.length === 0) continue
    if (buf.length > MAX_MB * 1024 * 1024) {
      errors.push(`${value.name}: ficheiro excede ${MAX_MB}MB`)
      continue
    }

    const id = newId('ev')
    const hash = await sha256(buf)

    if (isFrameField) {
      // field format: frame::<videoFileName>::<seconds>
      const [, videoName, secStr] = field.split('::')
      const key = await saveFrame(claim.id, id, buf)
      const item: EvidenceItem = {
        id,
        claimId: claim.id,
        kind: 'frame',
        fileName: `${videoName ?? 'video'}_f${secStr ?? '0'}s.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: buf.length,
        sha256: hash,
        storageKey: key,
        frameTimeSec: Number(secStr) || 0,
        uploadedAt: new Date().toISOString(),
      }
      saved.push(item)
      continue
    }

    const mime = value.type || mimeForKey(value.name)
    if (!isImage(mime) && !isVideo(mime)) {
      errors.push(`${value.name}: tipo não suportado (${mime})`)
      continue
    }

    const kind = isVideo(mime) ? 'video' : 'photo'
    const key = await saveFile(claim.id, id, buf, mime)
    const item: EvidenceItem = {
      id,
      claimId: claim.id,
      kind,
      fileName: value.name,
      mimeType: mime,
      sizeBytes: buf.length,
      slot,
      sha256: hash,
      storageKey: key,
      uploadedAt: new Date().toISOString(),
    }
    if (kind === 'photo') {
      item.exif = await extractExif(buf)
      item.quality = qualityFlags(item)
    }
    saved.push(item)
  }

  if (saved.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 422 })
  }

  await db.updateClaim(claim.id, (c) => {
    c.evidence.push(...saved)
    c.status = 'evidence_received'
    addAudit(c, 'customer', 'evidence_uploaded', `${saved.length} ficheiro(s)`)
  })

  return NextResponse.json({ ok: true, saved: saved.map((s) => ({ id: s.id, kind: s.kind })), errors })
}
