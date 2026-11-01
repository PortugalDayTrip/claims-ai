'use client'

import type { DaaDriver, DaaForm } from '@/lib/types'
import { useRef, useState } from 'react'

// 17 circunstâncias normalizadas da DAAA (mesma lista do impresso oficial)
const CIRCUMSTANCES = [
  'Estava estacionado/parado',
  'Saía de um estacionamento / abria porta',
  'Entrava num estacionamento',
  'Saía de parque, lugar privado ou caminho de terra',
  'Entrava em parque, lugar privado ou caminho de terra',
  'Entrava numa rotunda',
  'Circulava numa rotunda',
  'Embateu na traseira, mesmo sentido e mesma fileira',
  'Circulava no mesmo sentido, fileira diferente',
  'Mudava de fileira',
  'Fazia ultrapassagem',
  'Virava à direita',
  'Virava à esquerda',
  'Fazia marcha-atrás',
  'Invadia a faixa do sentido contrário',
  'Vinha da direita (num cruzamento)',
  'Não respeitou sinal de preferência ou vermelho',
]

/** Minimal canvas pad — pointer-draw, returns PNG data URL. */
function DrawPad({ label, onChange }: { label: string; onChange: (dataUrl: string | undefined) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [has, setHas] = useState(false)

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const start = (e: React.PointerEvent) => {
    drawing.current = true
    const ctx = ref.current!.getContext('2d')!
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1d1d1f'
    ctx.beginPath()
    const p = pos(e)
    ctx.moveTo(p.x, p.y)
    ref.current!.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const p = pos(e)
    const ctx = ref.current!.getContext('2d')!
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setHas(true)
  }
  const end = () => {
    drawing.current = false
    if (has && ref.current) onChange(ref.current.toDataURL('image/png'))
  }
  const clear = () => {
    const ctx = ref.current!.getContext('2d')!
    ctx.clearRect(0, 0, ref.current!.width, ref.current!.height)
    setHas(false)
    onChange(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <button type="button" onClick={clear} className="text-xs text-slate-400 hover:text-rose-600">limpar</button>
      </div>
      <canvas
        ref={ref}
        width={560}
        height={180}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="mt-1 w-full touch-none rounded-lg border border-slate-300 bg-white"
      />
      {has && <p className="mt-1 text-xs text-emerald-600">✓ capturado</p>}
    </div>
  )
}

function DriverCard({
  title,
  driver,
  onChange,
}: {
  title: string
  driver: DaaDriver
  onChange: (d: DaaDriver) => void
}) {
  const set = (k: keyof DaaDriver, v: unknown) => onChange({ ...driver, [k]: v })
  const toggleCirc = (c: string) => {
    const cur = new Set(driver.circumstances ?? [])
    cur.has(c) ? cur.delete(c) : cur.add(c)
    set('circumstances', [...cur])
  }
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Nome do condutor *" value={driver.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        <input className="input" placeholder="Seguradora" value={driver.insurerName ?? ''} onChange={(e) => set('insurerName', e.target.value)} />
        <input className="input" placeholder="N.º apólice" value={driver.policyNumber ?? ''} onChange={(e) => set('policyNumber', e.target.value)} />
        <input className="input" placeholder="Matrícula" value={driver.plate ?? ''} onChange={(e) => set('plate', e.target.value)} />
        <input className="input sm:col-span-2" placeholder="Veículo (marca/modelo/cor)" value={driver.vehicleDesc ?? ''} onChange={(e) => set('vehicleDesc', e.target.value)} />
        <input className="input" placeholder="Telefone" value={driver.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <p className="label mt-4">Circunstâncias — marque as que se aplicam</p>
      <div className="mt-2 grid gap-1.5">
        {CIRCUMSTANCES.map((c) => (
          <label key={c} className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={(driver.circumstances ?? []).includes(c)}
              onChange={() => toggleCirc(c)}
              className="mt-0.5"
            />
            {c}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function DaaWizard({
  token,
  claimId,
  claimantName,
  policyNumber,
  vehicleDesc,
  existing,
}: {
  token: string
  claimId: string
  claimantName: string
  policyNumber: string
  vehicleDesc: string
  existing?: DaaForm
}) {
  const [form, setForm] = useState<DaaForm>(
    existing ?? {
      accidentDate: '',
      accidentTime: '',
      place: '',
      injuries: false,
      driverA: { name: claimantName, policyNumber, vehicleDesc, circumstances: [] },
      driverB: { circumstances: [] },
    },
  )
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof DaaForm, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/c/${token}/daa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao guardar')
      setDone(
        data.jointSigned
          ? 'DAAA registada com assinatura dos dois condutores — as circunstâncias presumem-se verdadeiras.'
          : 'DAAA guardada (assinatura única — a outra parte pode contestar).',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="card mt-6 p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl text-white">✓</div>
        <p className="mt-4 font-semibold">{done}</p>
        <a href={`/c/${token}`} className="btn-secondary mt-5 inline-block">← Voltar ao meu sinistro</a>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Acidente */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800">O acidente</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input" value={form.accidentDate ?? ''} onChange={(e) => set('accidentDate', e.target.value)} />
          </div>
          <div>
            <label className="label">Hora</label>
            <input type="time" className="input" value={form.accidentTime ?? ''} onChange={(e) => set('accidentTime', e.target.value)} />
          </div>
          <div>
            <label className="label">Local *</label>
            <input className="input" placeholder="Rua, cruzamento, km…" value={form.place ?? ''} onChange={(e) => set('place', e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.injuries} onChange={(e) => set('injuries', e.target.checked)} /> Há feridos
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.materialDamageOther} onChange={(e) => set('materialDamageOther', e.target.checked)} /> Outros danos materiais
          </label>
        </div>
        <textarea
          className="input mt-3 min-h-[60px]"
          placeholder="Testemunhas (nome + contacto)"
          value={form.witnesses ?? ''}
          onChange={(e) => set('witnesses', e.target.value)}
        />
        <input
          className="input mt-3"
          placeholder="Pontos de impacto (ex.: frente A ↔ lateral direito B)"
          value={form.pointsOfImpact ?? ''}
          onChange={(e) => set('pointsOfImpact', e.target.value)}
        />
      </div>

      {/* Croqui */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800">Croqui do acidente</h3>
        <p className="mt-1 text-xs text-slate-500">Desenhe a posição dos veículos, direção e ponto de impacto.</p>
        <DrawPad label="Croqui" onChange={(d) => set('sketchDataUrl', d)} />
      </div>

      <DriverCard title="Veículo A — o seu" driver={form.driverA ?? { circumstances: [] }} onChange={(d) => set('driverA', d)} />
      <DriverCard title="Veículo B — o outro condutor" driver={form.driverB ?? { circumstances: [] }} onChange={(d) => set('driverB', d)} />

      {/* Assinaturas */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800">Assinaturas</h3>
        <p className="mt-1 text-xs text-slate-500">
          Ao assinar, declara que as circunstâncias estão corretas. Se ambos assinarem, o conteúdo presume-se verdadeiro.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <DrawPad label="Assinatura condutor A" onChange={(d) => set('driverA', { ...(form.driverA ?? {}), signatureDataUrl: d })} />
          <DrawPad label="Assinatura condutor B" onChange={(d) => set('driverB', { ...(form.driverB ?? {}), signatureDataUrl: d })} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className="flex gap-3">
        <a href={`/c/${token}`} className="btn-secondary flex-1 text-center">← Cancelar</a>
        <button onClick={submit} disabled={busy || !form.accidentDate || !form.place} className="btn-primary flex-1">
          {busy ? 'A guardar…' : 'Registar declaração'}
        </button>
      </div>
    </div>
  )
}
