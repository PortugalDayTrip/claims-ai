import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdjuster } from '@/lib/session'

type Ctx = { params: { id: string } }

// GET /api/claims/[id]/report — printable adjuster report (HTML)
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!isAdjuster()) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const claim = await db.getClaim(params.id)
  if (!claim) return NextResponse.json({ error: 'Sinistro não encontrado' }, { status: 404 })
  const a = claim.analysis
  const esc = (s?: string) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const findingsRows = (a?.aggregatedFindings ?? [])
    .map(
      (f) => `<tr>
        <td>${esc(f.damageType)}</td><td>${esc(f.location)}</td>
        <td>${f.severity}</td><td>${Math.round(f.confidence * 100)}%</td>
        <td>${f.estCostEur ? `€${f.estCostEur.min}–€${f.estCostEur.max}` : '—'}</td>
        <td>${esc(f.description)}</td></tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Relatório ${claim.id}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;color:#0f172a;padding:0 20px}
  h1{font-size:22px} h2{font-size:15px;margin-top:28px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td,th{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
  th{background:#f8fafc} .meta{color:#64748b;font-size:13px}
  .warn{background:#fef3c7;padding:10px 14px;border-radius:8px;font-size:13px}
  pre{white-space:pre-wrap;font-family:inherit;font-size:13px;background:#f8fafc;padding:14px;border-radius:8px}
  @media print{body{margin:0}}
</style></head><body>
<h1>Relatório de Análise de Sinistro — ClaimsAI</h1>
<p class="meta">Sinistro <b>${claim.id}</b> · criado ${new Date(claim.createdAt).toLocaleString('pt-PT')} · estado <b>${claim.status}</b></p>
<h2>Dados do segurado / FNOL</h2>
<table><tr><th>Segurado</th><td>${esc(claim.fnol.claimantName)} — ${esc(claim.fnol.claimantEmail)} ${esc(claim.fnol.claimantPhone ?? '')}</td></tr>
<tr><th>Apólice</th><td>${esc(claim.fnol.policyNumber ?? 'n/d')}</td></tr>
<tr><th>Bem segurado</th><td>${claim.fnol.assetType} — ${esc(claim.fnol.assetDescription ?? '')}</td></tr>
<tr><th>Sinistro</th><td>${esc(claim.fnol.incidentType ?? 'n/d')} em ${esc(claim.fnol.incidentDate ?? 'n/d')} — ${esc(claim.fnol.incidentLocation ?? 'n/d')}</td></tr>
<tr><th>Narrativa</th><td>${esc(claim.fnol.narrative ?? 'n/d')}</td></tr></table>
<h2>Resumo da análise IA</h2>
${
  a
    ? `<table>
<tr><th>Modelo</th><td>${a.model}</td></tr>
<tr><th>Imagens analisadas</th><td>${a.imagesAnalyzed}</td></tr>
<tr><th>Severidade global</th><td>${a.overallSeverity}</td></tr>
<tr><th>Custo estimado</th><td>€${a.estCostEur.min} – €${a.estCostEur.max}</td></tr>
<tr><th>Score de risco</th><td>${Math.round(a.fraudScore * 100)}%</td></tr>
<tr><th>Triage</th><td>${a.triage.verdict} — ${a.triage.recommendedAction}</td></tr>
<tr><th>Coerência</th><td>${a.consistencyCheck ? (a.consistencyCheck.consistent ? 'Coerente' : 'INCOERENTE: ' + esc(a.consistencyCheck.notes)) : 'n/d'}</td></tr></table>`
    : '<p>Sem análise executada.</p>'
}
${a && a.fraudSignals.length ? `<h2>Sinais de alerta</h2><div class="warn">${a.fraudSignals.map((s) => `• ${esc(s.detail)}`).join('<br>')}</div>` : ''}
<h2>Danos identificados (${a?.aggregatedFindings.length ?? 0})</h2>
<table><tr><th>Tipo</th><th>Local</th><th>Sev.</th><th>Conf.</th><th>Custo est.</th><th>Descrição</th></tr>${findingsRows || '<tr><td colspan=6>Sem danos detetados</td></tr>'}</table>
<h2>Relatório do perito (rascunho IA)</h2>
<pre>${esc(a?.reportText ?? 'n/d')}</pre>
<h2>Trilho de auditoria</h2>
<table><tr><th>Data</th><th>Ator</th><th>Ação</th><th>Detalhe</th></tr>
${claim.audit.map((e) => `<tr><td>${new Date(e.at).toLocaleString('pt-PT')}</td><td>${e.actor}</td><td>${e.action}</td><td>${esc(e.detail ?? '')}</td></tr>`).join('')}
</table>
<p class="meta">Gerado por ClaimsAI · os achados de IA são assistivos e não substituem peritagem humana.</p>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
