'use client'

// Customer portal: claim timeline ("food-delivery tracking"), upload wizard,
// and EU AI Act transparency disclosure.

import { useState } from 'react'
import type { Claim } from '@/lib/types'
import { CUSTOMER_STEPS, customerLabel, nextStep, stepIndex } from '@/lib/status'
import UploadWizard from '@/components/upload-wizard'
import PrivacyNote from '@/components/privacy-note'

// Legal deadline: claim must be reported within 8 days (DL 291/2007, art. 34.º)
const deadlineInfo = (incidentDate?: string) => {
  if (!incidentDate) return null
  const deadline = new Date(incidentDate)
  deadline.setDate(deadline.getDate() + 8)
  const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400_000)
  return { deadline, daysLeft }
}

export default function CustomerPortal({ token, claim }: { token: string; claim: Claim }) {
  const [state] = useState(claim)
  const [reviewRequested, setReviewRequested] = useState(
    claim.audit.some((e) => e.action === 'human_review_requested'),
  )
  const [reviewBusy, setReviewBusy] = useState(false)

  const idx = stepIndex(state.status)
  const isTerminal = ['approved', 'rejected', 'closed'].includes(state.status)
  const deadline = deadlineInfo(state.fnol.incidentDate)

  const requestReview = async () => {
    setReviewBusy(true)
    const res = await fetch(`/api/c/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_review' }),
    })
    setReviewBusy(false)
    if (res.ok) setReviewRequested(true)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-28">
      {/* ── Status hero — Uber tracking: big headline + progress bar ── */}
      <div className="card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
          Sinistro {state.id}
        </p>
        <h2 className="mt-1 text-[22px] font-bold tracking-tight text-[#1d1d1f]">
          {customerLabel(state.status)}
        </h2>

        {/* Horizontal progress — delivery-tracker style */}
        <div className="mt-6">
          <div className="flex items-center">
            {CUSTOMER_STEPS.map((s, i) => {
              const done = i < idx || isTerminal
              const active = i === idx && !isTerminal
              return (
                <div key={s.key} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-all ${
                      done ? 'bg-[#0e0e10] text-white'
                        : active ? 'bg-brand-600 text-white ring-4 ring-brand-600/20'
                        : 'bg-[#e8e8ed] text-[#6e6e73]'
                    }`}>
                      {done ? '✓' : i + 1}
                    </span>
                  </div>
                  {i < CUSTOMER_STEPS.length - 1 && (
                    <div className={`mx-1 h-[3px] flex-1 rounded-full ${i < idx ? 'bg-[#0e0e10]' : 'bg-[#e8e8ed]'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between">
            {CUSTOMER_STEPS.map((s, i) => {
              const active = i === idx && !isTerminal
              return (
                <p key={s.key} className={`w-16 text-center text-[10px] font-medium leading-tight ${
                  active ? 'text-brand-700' : i <= idx || isTerminal ? 'text-[#1d1d1f]' : 'text-[#6e6e73]'
                }`}>{s.label}</p>
              )
            })}
          </div>
        </div>

        {/* Next step — the single most important line (Uber "arriving in 5 min") */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f2f2f7] p-4">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-sm shadow-sm">→</span>
          <p className="text-sm font-medium leading-snug text-[#1d1d1f]">{nextStep(state.status)}</p>
        </div>

        {/* Legal deadlines — ASF transparency on response times */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6e6e73]">
          {deadline && deadline.daysLeft > 0 && (
            <span>⏳ Prazo legal de participação: <b>{deadline.daysLeft} {deadline.daysLeft === 1 ? 'dia' : 'dias'}</b> (até {deadline.deadline.toLocaleDateString('pt-PT')})</span>
          )}
          {['evidence_received', 'analyzing', 'analyzed', 'in_review'].includes(state.status) && (
            <span>📞 Previsão de primeiro contacto: <b>até 4 dias úteis</b></span>
          )}
        </div>
      </div>

      {/* ── AI Act disclosure (obrigatório: transparência) ──────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Transparência (Regulamento UE da IA):</b> a análise inicial dos danos é
        assistida por inteligência artificial. Cada dano identificado inclui um
        nível de confiança e é validado por um perito humano antes de qualquer
        decisão. Tem direito a pedir revisão humana de qualquer resultado.
      </div>

      {/* ── Upload (evidence) ─────────────────────────────────────── */}
      {state.status === 'awaiting_evidence' || state.status === 'rejected' ? (
        <UploadWizard token={token} claim={state} />
      ) : (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Enviar mais fotos / documentos ({state.evidence.length} enviados)
          </summary>
          <div className="mt-4"><UploadWizard token={token} claim={state} /></div>
        </details>
      )}

      {/* ── Direitos do segurado: revisão humana + reclamações ─────── */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-[#1d1d1f]">Os seus direitos</h3>
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-[#6e6e73]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-md">
              <b className="text-[#1d1d1f]">Revisão humana (RGPD art. 22).</b> Não
              concorda com a análise automática? Pode pedir que um perito humano
              reavalie tudo.
            </p>
            {reviewRequested ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                ✓ Pedido registado
              </span>
            ) : (
              <button onClick={requestReview} disabled={reviewBusy} className="btn-secondary shrink-0 text-xs">
                {reviewBusy ? 'A registar…' : 'Pedir revisão humana'}
              </button>
            )}
          </div>
          <p>
            <b className="text-[#1d1d1f]">Reclamações.</b> Pode reclamar ao Gestor de
            Reclamações da seguradora (resposta fundamentada em até 20 dias úteis),
            no{' '}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noreferrer" className="underline">
              Livro de Reclamações Eletrónico
            </a>{' '}
            ou junto da{' '}
            <a href="https://www.consumidor.asf.com.pt" target="_blank" rel="noreferrer" className="underline">
              ASF
            </a>
            . A gestão de reclamações é gratuita.
          </p>
          <p>
            <b className="text-[#1d1d1f]">Prefere falar com alguém?</b> Contacte a
            linha de apoio da sua seguradora — clientes em situação de
            vulnerabilidade têm atendimento prioritário.
          </p>
        </div>
      </div>

      <PrivacyNote compact />

      <p className="text-center text-xs text-slate-400">
        Sinistro {state.id} · guardado e auditado conforme RGPD
      </p>
    </div>
  )
}
