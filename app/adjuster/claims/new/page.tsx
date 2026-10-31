'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewClaimPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    claimantName: '',
    claimantEmail: '',
    claimantPhone: '',
    policyNumber: '',
    assetType: 'vehicle',
    assetDescription: '',
    incidentDate: '',
    incidentLocation: '',
    incidentType: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      setCreated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${created.url}`
    return (
      <div className="card mx-auto max-w-lg p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h2 className="mt-4 text-center text-xl font-bold">Sinistro criado</h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Envie esta ligação segura ao segurado — não requer login.
        </p>
        <div className="mt-5 flex gap-2">
          <input readOnly className="input font-mono text-xs" value={fullUrl}
            onFocus={(e) => e.target.select()} />
          <button className="btn-secondary shrink-0"
            onClick={() => navigator.clipboard.writeText(fullUrl)}>Copiar</button>
        </div>
        <div className="mt-4 flex gap-3">
          <a href={`mailto:${form.claimantEmail}?subject=Participação de sinistro&body=Envie a evidência em: ${fullUrl}`}
            className="btn-secondary flex-1">Enviar por email</a>
          <button className="btn-primary flex-1" onClick={() => router.push(`/adjuster/claims/${created.id}`)}>
            Abrir sinistro
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Novo sinistro</h1>
      <p className="mt-1 text-sm text-slate-500">Dados mínimos — o segurado completa o resto no link.</p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <form onSubmit={submit} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label">Nome do segurado *</label>
          <input required className="input" value={form.claimantName}
            onChange={(e) => setForm({ ...form, claimantName: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.claimantEmail}
            onChange={(e) => setForm({ ...form, claimantEmail: e.target.value })} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.claimantPhone}
            onChange={(e) => setForm({ ...form, claimantPhone: e.target.value })} />
        </div>
        <div>
          <label className="label">Nº apólice</label>
          <input className="input" value={form.policyNumber}
            onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} />
        </div>
        <div>
          <label className="label">Tipo de bem *</label>
          <select className="input" value={form.assetType}
            onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
            <option value="vehicle">Veículo</option>
            <option value="property">Imóvel / habitação</option>
            <option value="contents">Recheio / bens</option>
            <option value="other">Outro</option>
          </select>
        </div>
        <div>
          <label className="label">Descrição do bem</label>
          <input className="input" placeholder="Ex.: VW Golf 2019 · Apartamento T2"
            value={form.assetDescription}
            onChange={(e) => setForm({ ...form, assetDescription: e.target.value })} />
        </div>
        <div>
          <label className="label">Data do sinistro</label>
          <input type="date" className="input" value={form.incidentDate}
            onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Local</label>
          <input className="input" value={form.incidentLocation}
            onChange={(e) => setForm({ ...form, incidentLocation: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Tipo de ocorrência</label>
          <select className="input" value={form.incidentType}
            onChange={(e) => setForm({ ...form, incidentType: e.target.value })}>
            <option value="">Escolher…</option>
            {['Colisão', 'Estacionamento (dano em veículo parado)', 'Granizo/tempestade', 'Inundação',
              'Incêndio', 'Roubo/vandalismo', 'Queda de objeto', 'Rotura/fuga de água', 'Outro']
              .map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button className="btn-primary sm:col-span-2" disabled={busy}>
          {busy ? 'A criar…' : 'Criar sinistro e gerar ligação'}
        </button>
      </form>
    </div>
  )
}
