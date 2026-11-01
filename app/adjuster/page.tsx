import { SeverityBadge, StatusBadge, TriageBadge } from '@/components/ui'
import { db } from '@/lib/db'
import { nextDeadline } from '@/lib/deadlines'
import { isAdjuster } from '@/lib/session'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdjusterDashboard() {
  if (!isAdjuster()) redirect('/adjuster/login')
  const claims = await db.listClaims()

  const kpis = {
    total: claims.length,
    pending: claims.filter((c) => ['awaiting_evidence', 'evidence_received'].includes(c.status)).length,
    analyzed: claims.filter((c) => c.analysis).length,
    siu: claims.filter((c) => c.analysis?.triage.verdict === 'siu_investigate').length,
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sinistros</h1>
          <p className="text-sm text-slate-500">Análise IA + triagem + decisão do perito</p>
        </div>
        <Link href="/adjuster/claims/new" className="btn-primary">+ Novo sinistro</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total', kpis.total],
          ['Pendentes de evidência', kpis.pending],
          ['Analisados', kpis.analyzed],
          ['Sinalizados SIU', kpis.siu],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-2xl font-bold">{v}</p>
            <p className="text-xs text-slate-500">{l}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Segurado</th>
              <th className="px-4 py-3">Bem / Ocorrência</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Severidade</th>
              <th className="px-4 py-3">Custo est.</th>
              <th className="px-4 py-3">Risco</th>
              <th className="px-4 py-3" title="Tempo no estado atual vs SLA">SLA</th>
              <th className="px-4 py-3">Triage</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/adjuster/claims/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                    {c.fnol.claimantName}
                  </Link>
                  <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString('pt-PT')}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{c.fnol.assetType}</p>
                  <p className="text-xs text-slate-400">{c.fnol.incidentType ?? '—'} · {c.evidence.length} itens</p>
                </td>
                <td className="px-4 py-3"><StatusBadge s={c.status} /></td>
                <td className="px-4 py-3">{c.analysis ? <SeverityBadge s={c.analysis.overallSeverity} /> : '—'}</td>
                <td className="px-4 py-3 text-xs">
                  {c.analysis ? `€${c.analysis.estCostEur.min}–€${c.analysis.estCostEur.max}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {c.analysis ? (
                    <span className={`text-xs font-bold ${c.analysis.fraudScore >= 0.5 ? 'text-rose-600' : c.analysis.fraudScore >= 0.3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {Math.round(c.analysis.fraudScore * 100)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">{c.analysis ? <TriageBadge v={c.analysis.triage.verdict} /> : '—'}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const d = nextDeadline(c)
                    if (!d) return '—'
                    return (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        d.state === 'breached' ? 'bg-rose-100 text-rose-700'
                        : d.state === 'at_risk' ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`} title={`${d.label} — ${d.legalBasis}`}>
                        {d.state === 'breached' ? `⚠ ${Math.abs(d.daysLeft)}d` : `${d.daysLeft}d`}
                      </span>
                    )
                  })()}
                </td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                Sem sinistros. Crie o primeiro com «+ Novo sinistro».
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
