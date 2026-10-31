// POST /api/detect-view — infers which side of the vehicle a frame shows.
// Thin proxy to the local damage-detect ensemble (:8110): the v11n part
// labels already encode viewpoint evidence (front-bumper → front, etc.).
// When a dedicated view classifier joins the ensemble, this stays the same API.
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DAMAGE_DETECT_URL = process.env.DAMAGE_DETECT_URL ?? 'http://127.0.0.1:8110'
const DAMAGE_DETECT_TOKEN = process.env.DAMAGE_DETECT_TOKEN

export type CarView = 'front' | 'rear' | 'side' | 'unknown'

// v11n-14cls labels → view evidence. Weight = strength of the signal.
const VIEW_EVIDENCE: Record<string, { view: CarView; w: number }> = {
  'front-bumper-dent': { view: 'front', w: 3 },
  'Headlight-damage': { view: 'front', w: 2 },
  'Front-windscreen-damage': { view: 'front', w: 2 },
  'bonnet-dent': { view: 'front', w: 2 },
  'rear-bumper-dent': { view: 'rear', w: 3 },
  'Taillight-Damage': { view: 'rear', w: 2 },
  'Rear-windscreen-Damage': { view: 'rear', w: 2 },
  'boot-dent': { view: 'rear', w: 2 },
  'doorouter-dent': { view: 'side', w: 2 },
  'Sidemirror-Damage': { view: 'side', w: 2 },
  'Runningboard-Damage': { view: 'side', w: 2 },
  'fender-dent': { view: 'side', w: 1 }, // fender visible from front-side too
  'quaterpanel-dent': { view: 'side', w: 1 },
  'roof-dent': { view: 'side', w: 1 },
}

interface RawDet {
  label: string
  conf?: number
}

export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'form-data esperado' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'ficheiro em falta' }, { status: 400 })
  }
  if (file.size > 4_000_000) {
    return NextResponse.json({ error: 'imagem demasiado grande' }, { status: 413 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  try {
    const upstream = new FormData()
    upstream.append('file', new Blob([new Uint8Array(buf)]), 'frame.jpg')
    upstream.append('profile', 'vehicle')
    const res = await fetch(`${DAMAGE_DETECT_URL}/detect`, {
      method: 'POST',
      headers: DAMAGE_DETECT_TOKEN ? { Authorization: `Bearer ${DAMAGE_DETECT_TOKEN}` } : {},
      body: upstream,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      return NextResponse.json({ view: 'unknown', score: 0, offline: false })
    }
    const data = (await res.json()) as { detections?: RawDet[]; parts?: RawDet[]; damage?: RawDet[] }
    const all = [...(data.detections ?? []), ...(data.parts ?? []), ...(data.damage ?? [])]

    const scores: Record<CarView, number> = { front: 0, rear: 0, side: 0, unknown: 0 }
    for (const d of all) {
      const ev = VIEW_EVIDENCE[d.label]
      if (ev) scores[ev.view] += ev.w * (d.conf ?? 0.5)
    }
    const ranked = (Object.entries(scores) as [CarView, number][])
      .filter(([v]) => v !== 'unknown')
      .sort((a, b) => b[1] - a[1])
    const [view, score] = ranked[0] ?? ['unknown', 0]
    return NextResponse.json({
      view: score > 0 ? view : 'unknown',
      score: Math.round(score * 100) / 100,
      evidence: all.filter((d) => VIEW_EVIDENCE[d.label]).map((d) => d.label),
    })
  } catch {
    return NextResponse.json({ view: 'unknown', score: 0, offline: true })
  }
}
