import { NextRequest, NextResponse } from 'next/server'
import { runAnalysis } from '@/lib/analysis'
import { db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'

type Ctx = { params: { id: string } }

export const maxDuration = 300 // allow long-running VLM analysis

// POST /api/claims/[id]/analyze — run full pipeline (sync in dev;
// in production swap for a queue job)
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const claim = await db.getClaim(params.id)
  if (!claim) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })
  if (claim.status === 'analyzing') {
    return NextResponse.json({ error: 'Análise já em curso' }, { status: 409 })
  }
  const images = claim.evidence.filter((e) => e.kind === 'photo' || e.kind === 'frame')
  if (!images.length) {
    return NextResponse.json({ error: 'sem evidência fotográfica' }, { status: 400 })
  }

  const force = req.nextUrl.searchParams.get('force') === '1'

  try {
    const analysis = await runAnalysis(params.id, force)
    if (!analysis) return NextResponse.json({ error: 'sem resultados' }, { status: 500 })
    return NextResponse.json({ ok: true, analysis })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db.updateClaim(params.id, (c) => {
      c.status = 'evidence_received'
    })
    return NextResponse.json(
      { error: /fetch|ECONNREFUSED|timed? ?out/i.test(msg) ? 'Serviço de visão IA indisponível — verifique AI_VISION_URL' : msg },
      { status: 502 },
    )
  }
}
