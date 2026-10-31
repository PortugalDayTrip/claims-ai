'use client'

// Self-service FNOL — the claimant STARTS the process here (no adjuster needed).
// Minimal form (<3min, Insly standard): identity + asset + what happened.
// The guided intake (injuries, third parties, 9 photo slots) continues on the
// claim portal after creation.

import PrivacyNote from '@/components/privacy-note'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const ASSETS = [
  ['vehicle', '🚗 Veículo'],
  ['property', '🏠 Habitação'],
  ['contents', '📦 Recheio/conteúdo'],
  ['other', '📋 Outro'],
] as const

const INCIDENTS = [
  'Colisão', 'Estacionamento (dano em veículo parado)', 'Granizo/tempestade',
  'Inundação', 'Incêndio', 'Roubo/vandalismo', 'Queda de objeto',
  'Rotura/fuga de água', 'Outro',
]

export default function FnolPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [declared, setDeclared] = useState(false)
  const [f, setF] = useState({
    claimantName: '', claimantEmail: '', claimantPhone: '', policyNumber: '',
    assetType: 'vehicle' as string, assetDescription: '',
    incidentDate: '', incidentLocation: '', incidentType: '', narrative: '',
  })

  // Opt-in geolocation (e-SEGURNET benchmark — never silently captured)
  const captureGeo = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined,
      { timeout: 8000 },
    )
  }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/fnol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar sinistro')
      router.push(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setBusy(false)
    }
  }

  const valid = f.claimantName && /^\S+@\S+\.\S+$/.test(f.claimantEmail) && f.assetType && f.incidentDate && declared

  return (
    <div className="mx-auto max-w-xl py-4">
      <h1 className="text-2xl font-bold">Reportar um sinistro</h1>
      <p className="mt-1 text-sm text-slate-500">
        Preencha em menos de 3 minutos — recebe a sua ligação pessoal por email
        para enviar fotos e acompanhar o processo.
      </p>

      {/* AI Act art. 50 — disclosure before first interaction */}
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-900 ring-1 ring-amber-200">
        🤖 <b>Transparência:</b> a análise inicial das suas fotos é assistida por
        inteligência artificial e <b>validada por um perito humano</b> — tem sempre
        direito a pedir revisão humana. Prazo legal de participação: <b>8 dias</b>.
      </p>

      {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      {/* Os seus dados */}
      <div className="card mt-6 p-5">
        <h2 className="font-semibold text-slate-800">Os seus dados</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome completo *</label>
            <input className="input" value={f.claimantName} onChange={set('claimantName')} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" placeholder="para receber a ligação" value={f.claimantEmail} onChange={set('claimantEmail')} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input" value={f.claimantPhone} onChange={set('claimantPhone')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Nº de apólice</label>
            <input className="input" placeholder="se souber — ajuda-nos a confirmar cobertura" value={f.policyNumber} onChange={set('policyNumber')} />
          </div>
        </div>
      </div>

      {/* O bem */}
      <div className="card mt-4 p-5">
        <h2 className="font-semibold text-slate-800">O que foi danificado? *</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ASSETS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setF({ ...f, assetType: v })}
              className={`seg ${f.assetType === v ? 'seg-on' : ''}`}>{l}</button>
          ))}
        </div>
        <input className="input mt-3" placeholder="Descreva: Ex.: VW Golf 2019 preto, matrícula 12-AB-34"
          value={f.assetDescription} onChange={set('assetDescription')} />
      </div>

      {/* O incidente */}
      <div className="card mt-4 p-5">
        <h2 className="font-semibold text-slate-800">O incidente</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input" value={f.incidentDate} onChange={set('incidentDate')} />
          </div>
          <div>
            <label className="label">Local</label>
            <div className="flex gap-2">
              <input className="input" placeholder="Ex.: Lisboa, A2 km 30" value={f.incidentLocation} onChange={set('incidentLocation')} />
              <button
                type="button"
                onClick={captureGeo}
                title="Usar a minha localização atual"
                className={`btn-secondary shrink-0 ${geo ? '!bg-emerald-100' : ''}`}
              >
                {geo ? '📍✓' : '📍'}
              </button>
            </div>
            {geo && (
              <p className="mt-1 text-[10px] text-[#6e6e73]">
                Localização capturada ({geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}) — só com a sua permissão.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tipo de ocorrência</label>
            <select className="input" value={f.incidentType} onChange={set('incidentType')}>
              <option value="">Escolher…</option>
              {INCIDENTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">O que aconteceu?</label>
            <textarea className="input min-h-[80px]" value={f.narrative} onChange={set('narrative')}
              placeholder="Conte-nos resumidamente o sucedido — os detalhes completos pedimos a seguir" />
          </div>
        </div>
      </div>

      {/* Declaração de veracidade — assinatura simples (eIDAS art. 25) */}
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f2f2f7] p-4">
        <input
          type="checkbox"
          checked={declared}
          onChange={(e) => setDeclared(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-black"
        />
        <span className="text-xs leading-relaxed text-[#1d1d1f]">
          Declaro que as informações fornecidas são verdadeiras e completas, e
          compreendo que falsas declarações podem levar à perda de cobertura
          (art. 429.º Código Comercial). Esta declaração regista data, hora e
          identificação e equivale a assinatura eletrónica simples.
        </span>
      </label>

      <button className="btn-primary mt-4 w-full py-3 text-base" onClick={submit} disabled={!valid || busy}>
        {busy ? 'A criar o seu sinistro…' : 'Iniciar participação →'}
      </button>

      <PrivacyNote />

      <p className="mt-3 text-center text-[11px] text-[#6e6e73]">
        Prazo legal: participe até <b>8 dias</b> após a ocorrência (art. 34.º DL 291/2007).
        <br />Prefere falar com alguém? Ligue a linha de apoio da sua seguradora —
        clientes em situação de vulnerabilidade têm atendimento prioritário.
      </p>
    </div>
  )
}
