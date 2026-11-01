'use client'

import SketchBoard from '@/components/sketch-board'
import type { DaaDriver, DaaForm } from '@/lib/types'
import { useRef, useState } from 'react'

// 17 circunstâncias normalizadas da DAAA (impresso oficial)
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

// Ponto de embate — zonas clicáveis na vista aérea do veículo
const IMPACT_ZONES = [
  { key: 'front_left', label: 'frente esq.', x: 8, y: 8 },
  { key: 'front', label: 'frente', x: 40, y: 4 },
  { key: 'front_right', label: 'frente dta.', x: 72, y: 8 },
  { key: 'left', label: 'lateral esq.', x: 0, y: 36 },
  { key: 'right', label: 'lateral dta.', x: 84, y: 36 },
  { key: 'rear_left', label: 'traseira esq.', x: 8, y: 66 },
  { key: 'rear', label: 'traseira', x: 40, y: 70 },
  { key: 'rear_right', label: 'traseira dta.', x: 72, y: 66 },
]

const STEPS = ['Acidente', 'Veículos', 'Circunstâncias', 'Croqui', 'Rever & Assinar']

/** Canvas de desenho livre (croqui + assinaturas). */
function DrawPad({ label, tall, onChange }: { label: string; tall?: boolean; onChange: (d: string | undefined) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [has, setHas] = useState(false)
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (ref.current!.width / r.width), y: (e.clientY - r.top) * (ref.current!.height / r.height) }
  }
  const start = (e: React.PointerEvent) => {
    drawing.current = true
    const ctx = ref.current!.getContext('2d')!
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1d1d1f'
    ctx.beginPath()
    const p = pos(e)
    ctx.moveTo(p.x, p.y)
    ref.current!.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = ref.current!.getContext('2d')!
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setHas(true)
  }
  const end = () => {
    drawing.current = false
    if (has && ref.current) onChange(ref.current.toDataURL('image/png'))
  }
  const clear = () => {
    ref.current!.getContext('2d')!.clearRect(0, 0, ref.current!.width, ref.current!.height)
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
        width={700}
        height={tall ? 320 : 160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="mt-1 w-full touch-none rounded-xl border-2 border-slate-200 bg-white"
      />
      {has && <p className="mt-1 text-xs font-medium text-emerald-600">✓ capturado</p>}
    </div>
  )
}

/** Vista aérea do veículo com zonas de embate clicáveis. */
function ImpactPicker({ value, onChange }: { value?: string; onChange: (k: string) => void }) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 100 80" className="w-full">
        <rect x="18" y="6" width="64" height="68" rx="14" className="fill-slate-100 stroke-slate-400" strokeWidth="1.5" />
        <rect x="24" y="14" width="52" height="18" rx="4" className="fill-slate-200" />
        <rect x="24" y="50" width="52" height="14" rx="4" className="fill-slate-200" />
        {IMPACT_ZONES.map((z) => (
          <g key={z.key} onClick={() => onChange(z.key)} className="cursor-pointer">
            <circle
              cx={z.x + 8}
              cy={z.y + 4}
              r="8"
              className={value === z.key ? 'fill-rose-500' : 'fill-slate-300/60 hover:fill-brand-300'}
            />
            {value === z.key && <circle cx={z.x + 8} cy={z.y + 4} r="3" className="fill-white" />}
          </g>
        ))}
      </svg>
      <p className="text-center text-[11px] text-slate-500">
        {value ? `Ponto de embate: ${IMPACT_ZONES.find((z) => z.key === value)?.label}` : 'Toque onde o veículo foi atingido primeiro'}
      </p>
    </div>
  )
}

function DriverForm({ title, driver, onChange }: { title: string; driver: DaaDriver; onChange: (d: DaaDriver) => void }) {
  const set = (k: keyof DaaDriver, v: unknown) => onChange({ ...driver, [k]: v })
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Nome do condutor" value={driver.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        <input className="input" placeholder="Seguradora" value={driver.insurerName ?? ''} onChange={(e) => set('insurerName', e.target.value)} />
        <input className="input" placeholder="N.º apólice" value={driver.policyNumber ?? ''} onChange={(e) => set('policyNumber', e.target.value)} />
        <input className="input" placeholder="Matrícula" value={driver.plate ?? ''} onChange={(e) => set('plate', e.target.value)} />
        <input className="input sm:col-span-2" placeholder="Veículo (marca/modelo/cor)" value={driver.vehicleDesc ?? ''} onChange={(e) => set('vehicleDesc', e.target.value)} />
        <input className="input" placeholder="Telefone" value={driver.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <p className="label mt-4">Ponto de embate inicial</p>
      <ImpactPicker value={driver.impactPoint} onChange={(k) => set('impactPoint', k)} />
    </div>
  )
}

function CircumstancesPicker({ title, driver, onChange }: { title: string; driver: DaaDriver; onChange: (d: DaaDriver) => void }) {
  const cur = new Set(driver.circumstances ?? [])
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mt-0.5 text-[11px] text-slate-400">{cur.size} selecionada(s)</p>
      <div className="mt-3 grid gap-1.5">
        {CIRCUMSTANCES.map((c) => {
          const on = cur.has(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                on ? cur.delete(c) : cur.add(c)
                onChange({ ...driver, circumstances: [...cur] })
              }}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                on ? 'border-brand-500 bg-brand-50 font-medium text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {on ? '☑ ' : '☐ '}{c}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DaaWizard({
  token,
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
  const now = new Date()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<DaaForm>(
    existing ?? {
      accidentDate: now.toISOString().slice(0, 10),
      accidentTime: now.toTimeString().slice(0, 5),
      place: '',
      injuries: false,
      driverA: { name: claimantName, policyNumber, vehicleDesc, circumstances: [] },
      driverB: { circumstances: [] },
    },
  )
  const [geoBusy, setGeoBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof DaaForm, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const geolocate = () => {
    if (!navigator.geolocation) return
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${p.coords.latitude}&lon=${p.coords.longitude}&format=json`)
          const j = await r.json()
          set('place', j.display_name?.split(',').slice(0, 3).join(',') ?? `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`)
        } catch {
          set('place', `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`)
        } finally {
          setGeoBusy(false)
        }
      },
      () => setGeoBusy(false),
      { timeout: 8000 },
    )
  }

  const stepValid = [
    !!form.accidentDate && !!form.place && !form.injuries,
    true,
    true,
    true,
    !!form.driverA?.signatureDataUrl || !!form.driverB?.signatureDataUrl,
  ]

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
    <div className="mt-6">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span className={`grid h-6 w-6 place-items-center rounded-full ${i <= step ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}>
              {i + 1}
            </span>
            <span className={`hidden sm:inline ${i <= step ? 'text-brand-700' : ''}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-300 sm:w-6" />}
          </li>
        ))}
      </ol>

      {/* 1 — Acidente */}
      {step === 0 && (
        <div className="space-y-4">
          <div className={`card border-2 p-5 ${form.injuries ? 'border-rose-300 bg-rose-50' : 'border-transparent'}`}>
            <h3 className="font-semibold text-slate-800">Alguém ficou ferido?</h3>
            <div className="mt-3 flex gap-2">
              {(['Não', 'Sim'] as const).map((l) => {
                const v = l === 'Sim'
                return (
                  <button key={l} type="button" onClick={() => set('injuries', v)}
                    className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold ${form.injuries === v ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200'}`}>
                    {l}
                  </button>
                )
              })}
            </div>
            {form.injuries && (
              <p className="mt-3 rounded-lg bg-rose-100 p-3 text-xs font-medium text-rose-800">
                ⚠ Com feridos deve chamar as autoridades (112) — a DAAA digital aplica-se apenas a acidentes com danos materiais.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="grid gap-3 sm:grid-cols-3">
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
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Rua, cruzamento…" value={form.place ?? ''} onChange={(e) => set('place', e.target.value)} />
                  <button type="button" onClick={geolocate} disabled={geoBusy} title="Usar GPS"
                    className="btn-secondary shrink-0 px-3">{geoBusy ? '…' : '📍'}</button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.materialDamageOther} onChange={(e) => set('materialDamageOther', e.target.checked)} /> Outros danos materiais (muros, bens…)
              </label>
            </div>
            <textarea className="input mt-3 min-h-[60px]" placeholder="Testemunhas (nome + contacto)" value={form.witnesses ?? ''} onChange={(e) => set('witnesses', e.target.value)} />
          </div>
        </div>
      )}

      {/* 2 — Veículos */}
      {step === 1 && (
        <div className="space-y-4">
          <DriverForm title="🚙 Veículo A — o seu" driver={form.driverA ?? {}} onChange={(d) => set('driverA', d)} />
          <DriverForm title="🚗 Veículo B — o outro condutor" driver={form.driverB ?? {}} onChange={(d) => set('driverB', d)} />
        </div>
      )}

      {/* 3 — Circunstâncias */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Cada condutor marca o que se aplicava <b>a si</b> no momento do acidente.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <CircumstancesPicker title="Condutor A" driver={form.driverA ?? { circumstances: [] }} onChange={(d) => set('driverA', d)} />
            <CircumstancesPicker title="Condutor B" driver={form.driverB ?? { circumstances: [] }} onChange={(d) => set('driverB', d)} />
          </div>
        </div>
      )}

      {/* 4 — Croqui */}
      {step === 3 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800">Croqui do acidente</h3>
          <p className="mt-1 text-xs text-slate-500">
            Monte a cena: veículos A/B, vias, setas de direção, sinais — e desenhe à mão se precisar.
          </p>
          <div className="mt-3">
            <SketchBoard onChange={(d) => set('sketchDataUrl', d)} />
          </div>
          <input className="input mt-3" placeholder="Notas sobre o croqui (opcional)" value={form.pointsOfImpact ?? ''} onChange={(e) => set('pointsOfImpact', e.target.value)} />
        </div>
      )}

      {/* 5 — Rever & Assinar */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <h3 className="font-semibold text-slate-800">Resumo — confirme antes de assinar</h3>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <div><dt className="text-xs text-slate-400">Acidente</dt><dd>{form.accidentDate} {form.accidentTime} · {form.place}</dd></div>
              <div><dt className="text-xs text-slate-400">Feridos</dt><dd>{form.injuries ? 'Sim' : 'Não'}</dd></div>
              <div><dt className="text-xs text-slate-400">Veículo A</dt><dd>{form.driverA?.name} · {form.driverA?.plate ?? 's/ matrícula'} · embate {IMPACT_ZONES.find((z) => z.key === form.driverA?.impactPoint)?.label ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-400">Veículo B</dt><dd>{form.driverB?.name || '—'} · {form.driverB?.plate ?? 's/ matrícula'} · embate {IMPACT_ZONES.find((z) => z.key === form.driverB?.impactPoint)?.label ?? '—'}</dd></div>
              <div><dt className="text-xs text-slate-400">Circunstâncias</dt><dd>A: {form.driverA?.circumstances?.length ?? 0} · B: {form.driverB?.circumstances?.length ?? 0}</dd></div>
              <div><dt className="text-xs text-slate-400">Croqui</dt><dd>{form.sketchDataUrl ? '✓ desenhado' : '—'}</dd></div>
            </dl>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-slate-800">Assinaturas</h3>
            <p className="mt-1 text-xs text-slate-500">
              Cada condutor assina no ecrã. Se ambos assinarem, o conteúdo presume-se verdadeiro (art. 35.º DL 291/2007).
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <DrawPad label="Assinatura condutor A" onChange={(d) => set('driverA', { ...(form.driverA ?? {}), signatureDataUrl: d })} />
              <DrawPad label="Assinatura condutor B" onChange={(d) => set('driverB', { ...(form.driverB ?? {}), signatureDataUrl: d })} />
            </div>
          </div>

          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button onClick={submit} disabled={busy || !stepValid[4]} className="btn-primary w-full py-3">
            {busy ? 'A registar…' : 'Registar declaração'}
          </button>
          {!stepValid[4] && <p className="text-center text-xs text-slate-400">Pelo menos uma assinatura é necessária</p>}
        </div>
      )}

      {/* Nav */}
      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary flex-1">← Anterior</button>
        ) : (
          <a href={`/c/${token}`} className="btn-secondary flex-1 text-center">← Voltar</a>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" onClick={() => setStep(step + 1)} disabled={!stepValid[step]} className="btn-primary flex-1">
            Seguinte →
          </button>
        )}
      </div>
      {step === 0 && !stepValid[0] && (
        <p className="mt-2 text-center text-xs text-slate-400">Data e local são obrigatórios · com feridos chame 112</p>
      )}
    </div>
  )
}
