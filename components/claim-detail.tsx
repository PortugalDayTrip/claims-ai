'use client'

import { FraudMeter, SeverityBadge, StatusBadge, TriageBadge } from '@/components/ui'
import { damageTypesFor } from '@/lib/taxonomy'
import type { Claim, DamageFinding } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })
}

// ─── PT display helpers ──────────────────────────────────────────────────────
const REGION_PT: Record<string, string> = {
  'upper-left': 'sup. esquerdo', 'upper-center': 'sup. centro', 'upper-right': 'sup. direito',
  'middle-left': 'meio esquerdo', center: 'centro', 'middle-right': 'meio direito',
  'lower-left': 'inf. esquerdo', 'lower-center': 'inf. centro', 'lower-right': 'inf. direito',
  'upper left': 'sup. esquerdo', 'upper center': 'sup. centro', 'upper right': 'sup. direito',
  'middle left': 'meio esquerdo', 'middle right': 'meio direito',
  'lower left': 'inf. esquerdo', 'lower center': 'inf. centro', 'lower right': 'inf. direito',
}

const REPAIR_PT: Record<string, string> = {
  polish: 'polimento', pdr: 'PDR (martelinho)', repair_paint: 'reparar+pintar',
  seal: 'selagem', clean: 'limpeza', treat: 'tratamento', repair: 'reparação',
  replace: 'substituir', remediate: 'remediar', monitor: 'monitorizar', investigate: 'investigar',
}

function typePt(asset: string | undefined, key: string): string {
  const def = damageTypesFor((asset as 'vehicle' | 'property' | 'contents') || 'vehicle').find((d) => d.key === key)
  return def?.label ?? key
}


export default function ClaimDetail({ initial }: { initial: Claim }) {
  const [claim, setClaim] = useState(initial)
  const [busy, setBusy] = useState<'analyze' | 'decision' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState(initial.adjuster?.notes ?? '')
  const [override, setOverride] = useState('')
  const [lightbox, setLightbox] = useState<{ url: string; findings: DamageFinding[] } | null>(null)
  const [lbIdx, setLbIdx] = useState(0)
  const router = useRouter()
  const a = claim.analysis

  const refresh = async () => {
    const res = await fetch(`/api/claims/${claim.id}`)
    if (res.ok) setClaim(await res.json())
  }

  const analyze = async () => {
    setBusy('analyze')
    setError(null)
    try {
      const res = await fetch(`/api/claims/${claim.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha na análise')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const decide = async (decision: 'accepted' | 'rejected') => {
    setBusy('decision')
    setError(null)
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, overrideReason: override || undefined, notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro')
      await refresh()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(null)
    }
  }

  const mediaUrl = (key: string) => `/api/media/${key}`

  // Live progress: poll the claim while the pipeline runs server-side
  const analyzing = claim.status === 'analyzing'
  useEffect(() => {
    if (!analyzing) return
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzing, claim.id])

  const progress = claim.analysis?.progress

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => router.push('/adjuster')} className="text-xs text-slate-400 hover:text-brand-600">← Sinistros</button>
          <h1 className="text-2xl font-bold">{claim.fnol.claimantName}</h1>
          <p className="text-sm text-slate-500">
            {claim.id} · criado {fmtDate(claim.createdAt)} · <StatusBadge s={claim.status} />
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/claims/${claim.id}/report`} target="_blank" className="btn-secondary">Relatório ↗</a>
          <button onClick={analyze} disabled={busy === 'analyze' || claim.status === 'analyzing'} className="btn-primary">
            {busy === 'analyze' || claim.status === 'analyzing' ? 'A analisar…' : a ? 'Re-analisar' : 'Analisar com IA'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — FNOL + evidence */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Dados FNOL</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><dt className="text-slate-400">Bem</dt><dd>{claim.fnol.assetType} — {claim.fnol.assetDescription ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Apólice</dt><dd>{claim.fnol.policyNumber ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Ocorrência</dt><dd>{claim.fnol.incidentType ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Data / Local</dt><dd>{claim.fnol.incidentDate ?? '—'} · {claim.fnol.incidentLocation ?? '—'}</dd></div>
              <div><dt className="text-slate-400">Contacto</dt><dd>{claim.fnol.claimantEmail} {claim.fnol.claimantPhone}</dd></div>
            </dl>
            {claim.fnol.narrative && (
              <blockquote className="mt-3 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-600">
                “{claim.fnol.narrative}”
              </blockquote>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Evidência ({claim.evidence.length})
              </h2>
              <a className="text-xs text-brand-600 hover:underline" href={`/c/${claim.token}`} target="_blank">
                Link do cliente ↗
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {claim.evidence.map((e) => (
                <figure key={e.id} className="group relative">
                  {e.kind === 'video' ? (
                    <video src={mediaUrl(e.storageKey)} controls className="aspect-video w-full rounded-lg bg-black object-cover" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLbIdx(0)
                        setLightbox({
                          url: mediaUrl(e.storageKey),
                          findings: e.findings?.findings.filter((f) => f.bbox || f.polygon) ?? [],
                        })
                      }}
                      className="relative block w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl(e.storageKey)} alt={e.fileName}
                        className="aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200 transition group-hover:ring-brand-400" />
                      {/* detector overlays — segmentation masks + bboxes */}
                      {e.findings?.findings.some((f) => f.bbox || f.polygon) && (
                        <svg
                          className="pointer-events-none absolute inset-0 h-full w-full"
                          viewBox="0 0 1 1"
                          preserveAspectRatio="none"
                        >
                          {e.findings.findings.filter((f) => f.bbox || f.polygon).map((f, i) => (
                            <g key={i}>
                              {f.polygon && f.polygon.length >= 3 && (
                                <polygon
                                  points={f.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                                  fill="rgba(244,63,94,.22)"
                                  stroke="#f43f5e"
                                  strokeWidth="0.006"
                                />
                              )}
                              {f.bbox && (
                                <rect
                                  x={f.bbox.nx}
                                  y={f.bbox.ny}
                                  width={f.bbox.nw}
                                  height={f.bbox.nh}
                                  fill="none"
                                  stroke="#f43f5e"
                                  strokeWidth="0.004"
                                  strokeDasharray="0.01"
                                />
                              )}
                              <text
                                x={f.bbox?.nx ?? f.polygon?.[0]?.[0] ?? 0}
                                y={Math.max(0.03, (f.bbox?.ny ?? f.polygon?.[0]?.[1] ?? 0) - 0.012)}
                                fontSize="0.035"
                                fill="#fff"
                                stroke="#be123c"
                                strokeWidth="0.001"
                                paintOrder="stroke"
                              >
                                {`${typePt(claim.fnol.assetType, f.damageType)} ${(f.confidence * 100).toFixed(0)}%`}
                              </text>
                            </g>
                          ))}
                        </svg>
                      )}
                    </button>
                  )}
                  <figcaption className="mt-1 truncate text-[10px] text-slate-400">
                    {e.kind === 'frame' ? `⏱ ${e.frameTimeSec}s · ` : ''}{e.fileName}
                  </figcaption>
                  {e.analysisError && (
                    <span
                      title={`Análise falhou: ${e.analysisError}`}
                      className="absolute left-1 top-1 cursor-help rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      ✗ falhou
                    </span>
                  )}
                  {e.findings && (
                    <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                      e.findings.findings.length ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}>
                      {e.findings.findings.length ? `${e.findings.findings.length} achado(s)` : 'ok'}
                    </span>
                  )}
                  {!e.findings?.isRealPhoto && e.findings && (
                    <span className="absolute right-1 top-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">⚠</span>
                  )}
                </figure>
              ))}
              {claim.evidence.length === 0 && (
                <p className="col-span-4 py-8 text-center text-sm text-slate-400">
                  À espera de evidência — envie o link ao segurado.
                </p>
              )}
            </div>
          </section>

          {/* Aggregated findings table */}
          {a && (
            <section className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Danos agregados pela IA ({a.aggregatedFindings.length})
              </h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400">
                    <th className="py-2">Tipo</th><th>Peça/Zona</th><th>Sev.</th><th>Tam.</th><th>Reparação</th><th>Conf.</th><th>Custo</th><th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {a.aggregatedFindings.map((f, i) => (
                    <tr key={i} className="border-t border-slate-100 align-top">
                      <td className="py-2 font-medium">
                        {typePt(claim.fnol.assetType, f.damageType)}
                        {f.preExisting && (
                          <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700" title="possível dano pré-existente">PRÉ</span>
                        )}
                      </td>
                      <td>
                        {f.location}
                        {f.region && <p className="text-[10px] text-slate-400">{REGION_PT[f.region] ?? f.region}</p>}
                      </td>
                      <td><SeverityBadge s={f.severity} /></td>
                      <td className="text-[11px] text-slate-500">{f.sizeEstimate ?? '—'}</td>
                      <td className="text-[11px]">{f.repairType ? (REPAIR_PT[f.repairType] ?? f.repairType) : '—'}</td>
                      <td className="text-xs">{Math.round(f.confidence * 100)}%</td>
                      <td className="text-xs">{f.estCostEur ? `€${f.estCostEur.min}–${f.estCostEur.max}` : '—'}</td>
                      <td className="max-w-[180px] text-xs text-slate-500">
                        {f.description}
                        {f.sourceHint && <p className="text-[10px] text-brand-600">origem provável: {f.sourceHint}</p>}
                        {f.validationNotes?.length ? (
                          <p className="text-[10px] text-slate-400" title={f.validationNotes.join('; ')}>⚙ ajustado</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {a.aggregatedFindings.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-400">Sem danos detetados</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Right — analysis panel */}
        <div className="space-y-6">
          {a ? (
            <>
              <section className="card space-y-4 p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Resultado IA</h2>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Severidade</span>
                  <SeverityBadge s={a.overallSeverity} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Custo estimado</span>
                  <span className="font-bold">€{a.estCostEur.min} – €{a.estCostEur.max}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Imagens analisadas</span>
                  <span className="font-semibold">{a.imagesAnalyzed}</span>
                </div>
                <FraudMeter score={a.fraudScore} />
                {a.consistencyCheck && (
                  <div className={`rounded-lg px-3 py-2 text-xs ${a.consistencyCheck.consistent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {a.consistencyCheck.consistent ? '✓ Evidência coerente com a narrativa' : `⚠ Incoerência: ${a.consistencyCheck.notes}`}
                  </div>
                )}
              </section>

              <section className="card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Triage</h2>
                <div className="mt-2"><TriageBadge v={a.triage.verdict} /></div>
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {a.triage.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{a.triage.recommendedAction}</p>
              </section>

              {a.fraudSignals.length > 0 && (
                <section className="card p-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Sinais de alerta ({a.fraudSignals.length})
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {a.fraudSignals.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${s.weight >= 0.35 ? 'bg-rose-500' : s.weight >= 0.15 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span className="text-slate-600">{s.detail}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(() => {
                const failed = claim.evidence.filter((e) => e.analysisError)
                if (!failed.length) return null
                return (
                  <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-bold text-rose-700">
                      ⚠ Análise falhou em {failed.length} imagem(ns) — o serviço de visão IA não respondeu.
                    </p>
                    <p className="mt-1 text-xs text-rose-600">
                      {failed[0].analysisError} — verifique <code>AI_VISION_URL</code> (Ollama não está acessível).
                      Depois de resolver, carregue «Re-analisar» — apenas as imagens em falta são processadas.
                    </p>
                  </section>
                )
              })()}

              {a.reportText && (
                <section className="card p-5">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Relatório IA (rascunho)</h2>
                  <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                    {a.reportText}
                  </pre>
                </section>
              )}
            </>
          ) : (
            <section className="card p-5 text-center text-sm text-slate-500">
              Sem análise ainda. Quando houver evidência, carregue «Analisar com IA».
            </section>
          )}

          {analyzing && (
            <section className="card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">A analisar…</h2>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${progress?.total ? Math.round(((progress.done ?? 0) / progress.total) * 100) : 8}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {progress?.phase === 'aggregate'
                  ? 'A agregar achados e verificar coerência…'
                  : `${progress?.done ?? 0}/${progress?.total ?? '?'} imagens${progress?.current ? ` · ${progress.current}` : ''}`}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                Em CPU cada imagem pode demorar ~30–90s. Pode deixar a página — a análise continua no servidor.
              </p>
            </section>
          )}

          {/* Decision */}
          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Decisão do perito</h2>
            <textarea
              className="input mt-3 min-h-[70px] text-xs"
              placeholder="Notas do perito…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <input
              className="input mt-2 text-xs"
              placeholder="Motivo (se divergir da recomendação IA)"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => decide('accepted')} disabled={busy === 'decision' || claim.status === 'approved'}
                className="btn flex-1 bg-emerald-600 text-white hover:bg-emerald-700">
                {claim.status === 'approved' ? 'Aprovado ✓' : 'Aprovar'}
              </button>
              <button onClick={() => decide('rejected')} disabled={busy === 'decision' || claim.status === 'rejected'}
                className="btn-danger flex-1">
                {claim.status === 'rejected' ? 'Rejeitado' : 'Rejeitar'}
              </button>
            </div>
            {claim.adjuster?.decision && (
              <p className="mt-2 text-xs text-slate-400">
                Decidido {fmtDate(claim.adjuster.decidedAt)}{claim.adjuster.overrideReason ? ` — ${claim.adjuster.overrideReason}` : ''}
              </p>
            )}
          </section>

          {/* FNOL intake — guided answers that drive routing */}
          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">FNOL guiado</h2>
            {claim.fnol.injuries && (
              <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                ⚠ FERIDOS REPORTADOS — tratamento prioritário
                {claim.fnol.injuryDetail ? ` · ${claim.fnol.injuryDetail}` : ''}
              </p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
              {claim.fnol.incidentTime && <><dt className="text-slate-400">Hora</dt><dd>{claim.fnol.incidentTime}</dd></>}
              {claim.fnol.drivable === false && <><dt className="text-slate-400">Conduzível</dt><dd className="font-semibold text-rose-600">Não</dd></>}
              {claim.fnol.needsTow && <><dt className="text-slate-400">Reboque</dt><dd className="font-semibold">Necessário</dd></>}
              {claim.fnol.needsRental && <><dt className="text-slate-400">Veículo subst.</dt><dd className="font-semibold">Necessário</dd></>}
              {claim.fnol.vin && <><dt className="text-slate-400">VIN</dt><dd className="font-mono">{claim.fnol.vin}</dd></>}
              {claim.fnol.odometerKm != null && <><dt className="text-slate-400">Odómetro</dt><dd>{claim.fnol.odometerKm.toLocaleString('pt-PT')} km</dd></>}
              {claim.fnol.thirdPartyPlate && <><dt className="text-slate-400">3º veículo</dt><dd className="font-mono">{claim.fnol.thirdPartyPlate}{claim.fnol.thirdPartyName ? ` · ${claim.fnol.thirdPartyName}` : ''}</dd></>}
              {claim.fnol.thirdPartyUninsured && <><dt className="text-slate-400">3º sem seguro</dt><dd className="font-semibold text-amber-700">FGA/GPS</dd></>}
              {claim.fnol.circumstances && claim.fnol.circumstances.length > 0 && (
                <><dt className="text-slate-400">Circunstâncias</dt><dd>{claim.fnol.circumstances.join(' · ')}</dd></>
              )}
              {claim.fnol.incidentLat != null && claim.fnol.incidentLng != null && (
                <><dt className="text-slate-400">GPS</dt><dd className="font-mono">{claim.fnol.incidentLat.toFixed(5)}, {claim.fnol.incidentLng.toFixed(5)}</dd></>
              )}
              {claim.fnol.declarationAccepted && (
                <><dt className="text-slate-400">Declaração</dt><dd className="text-emerald-700">✓ {claim.fnol.declarationAt ? new Date(claim.fnol.declarationAt).toLocaleDateString('pt-PT') : 'aceite'}</dd></>
              )}
              {claim.fnol.witnesses && <><dt className="text-slate-400">Testemunhas</dt><dd>{claim.fnol.witnesses}</dd></>}
              {claim.fnol.policeReport && <><dt className="text-slate-400">Auto polícia</dt><dd>{claim.fnol.policeReport}</dd></>}
              {claim.fnol.preferredContact && <><dt className="text-slate-400">Contacto pref.</dt><dd>{claim.fnol.preferredContact}</dd></>}
            </dl>
            {!claim.fnol.injuries && !claim.fnol.vin && !claim.fnol.thirdPartyPlate && (
              <p className="mt-2 text-[10px] text-slate-400">Intake guiado pendente ou pré-atualização.</p>
            )}
          </section>

          {/* AI Act disclosure — humano supervisiona, IA apenas recomenda */}
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10px] text-slate-500">
            Regulamento UE da IA + RGPD art.22: os achados são <b>recomendações assistidas por IA</b> —
            a decisão final sobre o sinistro é responsabilidade do perito humano.
          </p>

          {/* Audit */}
          <section className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Auditoria</h2>
            <ul className="mt-3 space-y-1.5 text-[11px] text-slate-500">
              {[...claim.audit].reverse().slice(0, 12).map((e, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{e.action}{e.detail ? ` — ${e.detail}` : ''}</span>
                  <span className="shrink-0">{new Date(e.at).toLocaleDateString('pt-PT')}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Lightbox — reviews findings ONE AT A TIME */}
      {lightbox && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6" onClick={() => setLightbox(null)}>
          <div className="flex max-h-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.url} alt="evidência" className="max-h-[75vh] max-w-[90vw] rounded-lg" />
              {lightbox.findings.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                >
                  {/* dim ALL findings faintly, highlight ONLY the active one */}
                  {lightbox.findings.map((f, i) => {
                    const active = i === lbIdx
                    return (
                      <g key={i} opacity={active ? 1 : 0.18}>
                        {f.polygon && f.polygon.length >= 3 && (
                          <polygon
                            points={f.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
                            fill={active ? 'rgba(244,63,94,.30)' : 'rgba(244,63,94,.10)'}
                            stroke={active ? '#fb7185' : '#fb7185'}
                            strokeWidth={active ? 0.008 : 0.004}
                          />
                        )}
                        {f.bbox && (
                          <rect
                            x={f.bbox.nx} y={f.bbox.ny} width={f.bbox.nw} height={f.bbox.nh}
                            fill="none"
                            stroke={active ? '#fb7185' : '#fb7185'}
                            strokeWidth={active ? 0.005 : 0.003}
                          />
                        )}
                      </g>
                    )
                  })}
                </svg>
              )}
            </div>
            {lightbox.findings.length > 0 && (
              <div className="flex max-w-[90vw] flex-wrap items-center justify-center gap-2">
                {lightbox.findings.map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLbIdx(i)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      i === lbIdx
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/15 text-white/80 hover:bg-white/25'
                    }`}
                  >
                    {i + 1}. {typePt(claim.fnol.assetType, f.damageType)} · {(f.confidence * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            )}
            {lightbox.findings[lbIdx] && (
              <p className="max-w-[80ch] text-center text-sm text-white/90">
                <strong>{typePt(claim.fnol.assetType, lightbox.findings[lbIdx].damageType)}</strong>
                {lightbox.findings[lbIdx].location ? ` · ${lightbox.findings[lbIdx].location}` : ''}
                {' · '}sev. {{ minor: 'menor', moderate: 'moderada', severe: 'severa' }[lightbox.findings[lbIdx].severity] ?? lightbox.findings[lbIdx].severity} · {(lightbox.findings[lbIdx].confidence * 100).toFixed(0)}%
                {lightbox.findings[lbIdx].description ? ` — ${lightbox.findings[lbIdx].description}` : ''}
              </p>
            )}
            <p className="text-xs text-white/40">clique fora ou Esc para fechar · clique num achado para o destacar</p>
          </div>
        </div>
      )}
    </div>
  )
}
