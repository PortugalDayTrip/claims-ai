'use client'

import { useState } from 'react'

type Status = 'Ativo' | 'A construir' | 'Parcial' | 'Planeado'

const LAYERS: { n: string; icon: string; t: string; d: string; etapa: string; status: Status }[] = [
  { n: '1', icon: '📥', t: 'Intake Multi-canal', d: 'Link web, email, corretor, API — o claim nasce onde a notícia chegar. Dup-check automático.', etapa: 'Aviso / Entrada', status: 'Ativo' },
  { n: '2', icon: '✅', t: 'Cobertura', d: 'Apólice em vigor? Bem certo? Cobertura aplica? Sinal — nunca decisão automática.', etapa: 'Cobertura', status: 'A construir' },
  { n: '3', icon: '🧭', t: 'Triage & Rota', d: 'Express · perito · SIU · total-loss. Escalonamento por severidade e workload.', etapa: 'Triagem', status: 'Ativo' },
  { n: '4', icon: '⚙️', t: 'Tarefas & SLA', d: 'Cada marco legal vira uma tarefa. A fila do perito ordenada por deadline.', etapa: 'Execução', status: 'A construir' },
  { n: '5', icon: '💰', t: 'Reservas', d: 'Reserva automática, movimentos auditados, limites de aprovação por nível.', etapa: 'Dinheiro', status: 'A construir' },
  { n: '6', icon: '🔄', t: 'Subrogação', d: 'Culpa de terceiro → reclamação automática. Net cost real por sinistro.', etapa: 'Recuperação', status: 'Planeado' },
  { n: '7', icon: '📊', t: 'Métricas', d: 'Funnel, SLA ASF, cycle time, workload por perito, STP rate.', etapa: 'Gestão', status: 'Parcial' },
  { n: '8', icon: '🔌', t: 'Integrações', d: 'Oficinas, meteo verify, e-SEGURNET, bordereaux — trabalho fora da app.', etapa: 'Conectividade', status: 'Planeado' },
]

const STATUS_STYLE: Record<Status, { chip: string; dot: string }> = {
  'Ativo': { chip: 'border-emerald-300 bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  'A construir': { chip: 'border-sky-300 bg-sky-100 text-sky-700', dot: 'bg-[#0284c7]' },
  'Parcial': { chip: 'border-amber-300 bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  'Planeado': { chip: 'border-purple-300 bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
}

const FILTERS: { id: Status | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas (8 camadas)' },
  { id: 'Ativo', label: 'Ativas' },
  { id: 'A construir', label: 'A construir' },
  { id: 'Parcial', label: 'Parcial' },
  { id: 'Planeado', label: 'Planeadas' },
]

const PIPELINE = ['1. Aviso (Intake)', '2. Cobertura', '3. Triagem', '4. Execução', '5. Dinheiro', '6. Recuperação']

export default function LayersGrid() {
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const visible = LAYERS.filter((l) => filter === 'all' || l.status === filter)

  return (
    <div>
      {/* pipeline strip */}
      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-md sm:p-6">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-left">
          Fluxo sequencial do sinistro
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
          {PIPELINE.map((p, i) => (
            <div key={p} className="flex min-w-[110px] flex-1 items-center gap-2">
              <span className={`flex-1 rounded-xl border p-3 text-center ${i % 2 === 0 ? 'border-sky-200 bg-sky-50 text-[#0369a1]' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                {p}
              </span>
              {i < PIPELINE.length - 1 && <span className="hidden text-slate-300 sm:block">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* filters */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filter === f.id
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.id !== 'all' && <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_STYLE[f.id as Status].dot}`} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((l) => {
          const s = STATUS_STYLE[l.status]
          return (
            <div key={l.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-3xl">{l.icon}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${s.chip}`}>{l.status}</span>
              </div>
              <h3 className="mb-1 text-base font-bold text-slate-900">{l.n}. {l.t}</h3>
              <p className="mb-3 text-xs leading-relaxed text-slate-600">{l.d}</p>
              <p className="font-mono text-[11px] text-slate-400">Etapa: {l.etapa}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
