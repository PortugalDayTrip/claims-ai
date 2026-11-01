'use client'

import { useState } from 'react'
import Link from 'next/link'

type Scenario = {
  id: string
  label: string
  icon: string
  img: string
  tag: string
  scope: string
  loss: string
  fraud: string
  fraudTone: 'low' | 'mid'
  speed: string
}

const SCENARIOS: Record<'property' | 'auto', Scenario[]> = {
  property: [
    { id: 'water', label: 'Fuga de Água', icon: '💧', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', tag: 'Fuga água canalização · 94%', scope: 'Habitação principal', loss: 'Infiltração teto/parede', fraud: 'Baixo (0,8%)', fraudTone: 'low', speed: '1,2 s' },
    { id: 'fire', label: 'Incêndio/Fumo', icon: '🔥', img: 'https://images.unsplash.com/photo-1565610222536-ef125c59da2e?auto=format&fit=crop&w=800&q=80', tag: 'Danos de fumo/calor · 91%', scope: 'Cozinha / circuito', loss: 'Danos por fumo/fogo', fraud: 'Muito baixo (0,5%)', fraudTone: 'low', speed: '1,5 s' },
    { id: 'storm', label: 'Danos Elétricos', icon: '⚡', img: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80', tag: 'Sobretensão elétrica · 93%', scope: 'Quadro elétrico', loss: 'Danos elétricos', fraud: 'Baixo (1,1%)', fraudTone: 'low', speed: '1,3 s' },
    { id: 'vandalism', label: 'Vandalismo', icon: '🪟', img: 'https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=800&q=80', tag: 'Vidro partido · 88%', scope: 'Janela / fachada', loss: 'Quebra forçada', fraud: 'Médio (3,4%)', fraudTone: 'mid', speed: '1,6 s' },
  ],
  auto: [
    { id: 'collision', label: 'Colisão', icon: '🚗', img: 'https://images.unsplash.com/photo-1599256621730-535171e28e50?auto=format&fit=crop&w=800&q=80', tag: 'Dano para-choques · 95%', scope: 'Automóvel ligeiro', loss: 'Colisão dianteira', fraud: 'Baixo (1,0%)', fraudTone: 'low', speed: '1,1 s' },
    { id: 'windshield', label: 'Quebra Vidros', icon: '🪟', img: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80', tag: 'Fissura para-brisas · 97%', scope: 'Vidro dianteiro', loss: 'Quebra isolada vidros', fraud: 'Muito baixo (0,3%)', fraudTone: 'low', speed: '0,9 s' },
    { id: 'towing', label: 'Reboque/Avaria', icon: '🛻', img: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80', tag: 'Assistência em viagem · 99%', scope: 'Veículo imobilizado', loss: 'Avaria / reboque', fraud: 'Baixo (0,4%)', fraudTone: 'low', speed: '1,0 s' },
    { id: 'hail', label: 'Granizo', icon: '🌨️', img: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', tag: 'Mossas de granizo · 92%', scope: 'Capô e tejadilho', loss: 'Fenómenos naturais', fraud: 'Baixo (1,2%)', fraudTone: 'low', speed: '1,4 s' },
  ],
}

const btnBase = 'flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-all'
const btnOff = 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
const btnOn = 'border-[#0284c7] bg-sky-50 text-[#0369a1]'

export default function HeroVisual() {
  const [cat, setCat] = useState<'property' | 'auto'>('property')
  const [scId, setScId] = useState('water')
  const sc = SCENARIOS[cat].find((s) => s.id === scId) ?? SCENARIOS[cat][0]

  function switchCat(next: 'property' | 'auto') {
    setCat(next)
    setScId(SCENARIOS[next][0].id)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-2xl backdrop-blur-xl">
      {/* header */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Simulador FNOL multi-ramo</span>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600">#FNOL-8821</span>
      </div>

      {/* category segmented */}
      <div className="mb-3 flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
        {([['property', '🏠 Propriedade'], ['auto', '🚗 Automóvel']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => switchCat(k)}
            className={`flex-1 rounded-lg py-2 transition-all ${cat === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* scenario buttons */}
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS[cat].map((s) => (
          <button key={s.id} onClick={() => setScId(s.id)} className={`${btnBase} ${sc.id === s.id ? btnOn : btnOff}`}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* detection canvas */}
      <div className="relative mt-4 flex h-44 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900 sm:h-48">
        <img src={sc.img} alt={`Cenário: ${sc.label}`} className="h-full w-full object-cover" />
        <div className="hero-scan absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#0284c7] to-transparent shadow-[0_0_12px_#0284c7]" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-[#0284c7]/50 bg-slate-900/90 px-3 py-1 font-mono text-[11px] text-white shadow backdrop-blur">
          🤖 <span>{sc.tag}</span>
        </div>
        <div className="absolute bottom-2 right-2 rounded-md border border-emerald-500/30 bg-black/80 px-2.5 py-1 font-mono text-[10px] text-emerald-400 backdrop-blur">
          ⏱ {sc.speed} / foto
        </div>
      </div>

      {/* intake summary */}
      <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <span>📋 Intake FNOL guiado</span>
          <span className="font-mono text-[11px] text-emerald-600">✓ completo à 1ª</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div><strong>Âmbito:</strong> {sc.scope}</div>
          <div><strong>Danos:</strong> {sc.loss}</div>
          <div><strong>Validação:</strong> <span className="font-mono text-slate-700">GPS + EXIF</span></div>
          <div><strong>Risco fraude:</strong> <span className={`font-mono font-bold ${sc.fraudTone === 'low' ? 'text-emerald-600' : 'text-amber-600'}`}>{sc.fraud}</span></div>
        </div>
      </div>

      <Link
        href="/fnol"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0284c7] py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#0369a1] hover:shadow-lg"
      >
        ▶ Experimentar com um sinistro real
      </Link>
    </div>
  )
}
