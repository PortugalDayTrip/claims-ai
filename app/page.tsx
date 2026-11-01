import CustomerEntry from '@/components/customer-entry'
import HeroVisual from '@/components/hero-visual'
import LayersGrid from '@/components/layers-grid'
import Link from 'next/link'

const MOTOR = [
  {
    icon: '📋', t: 'FNOL Guiado', d: 'Feridos, reboque, VIN, testemunhas — intake certo à 1ª.',
    sub: 'Formulários dinâmicos adaptados ao tipo de sinistro de propriedade ou auto.',
    bg: 'bg-sky-50 text-[#0284c7]',
  },
  {
    icon: '📸', t: 'Deteção AI', d: '4 modelos AI, ~1,5 s/foto — dano, peça, polígono, confiança.',
    sub: 'Segmentação por visão computacional executada em alta velocidade.',
    bg: 'bg-indigo-50 text-[#4f46e5]',
  },
  {
    icon: '🛡️', t: 'Fraude & SIU', d: 'EXIF, duplicados, qualidade — flag, nunca bloqueio.',
    sub: 'Sinalização preventiva de anomalias para análise por peritos dedicados.',
    bg: 'bg-amber-50 text-amber-600',
  },
  {
    icon: '📜', t: 'Audit Trail', d: 'Cada ação assinada — IA, perito, sistema, cliente.',
    sub: 'Rastreabilidade total para fins regulatórios e auditoria interna.',
    bg: 'bg-emerald-50 text-emerald-600',
  },
] as const

const COMPLIANCE = [
  { icon: '⚖️', t: 'EU AI Act', hl: 'IA recomenda, humano decide', d: 'transparência por achado.', sub: 'Todas as explicações e scores da IA são auditáveis e revisáveis pelos peritos.' },
  { icon: '🔏', t: 'RGPD art. 22', hl: 'Direito a revisão humana', d: 'nenhuma decisão 100% automática.', sub: 'Salvaguarda dos direitos dos segurados com opção de contestação direta.' },
  { icon: '🏛️', t: 'ASF · DL 291', hl: 'Tempos de resposta por SLA', d: 'prontos para auditoria.', sub: 'Cumprimento dos prazos regulamentares da Autoridade de Supervisão de Seguros.' },
] as const

export default function Home() {
  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl pt-4 lg:pt-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* copy */}
          <div className="space-y-6 text-center lg:col-span-6 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1.5 text-xs font-semibold text-[#0369a1] shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0284c7]" />
              Especializado em Habitação, Condomínio & FNOL Automóvel
            </span>

            <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Abertura e triagem de sinistros{' '}
              <span className="bg-gradient-to-r from-[#0284c7] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
                FNOL em segundos
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
              Do primeiro contacto ao envio para peritagem. Intake inteligente,
              visão computacional AI e compliance legal integrado — com o perito
              sempre a decidir.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-1 sm:flex-row lg:justify-start">
              <Link
                href="/fnol"
                className="btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#4f46e5] px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-xl sm:w-auto"
              >
                🚀 Reportar um sinistro
              </Link>
              <Link
                href="/adjuster"
                className="btn flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
              >
                ▶ Sou perito
              </Link>
            </div>

            {/* stats */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-5 text-left">
              <div>
                <p className="text-lg font-black text-slate-900">~1,5 s</p>
                <p className="text-xs font-medium text-slate-500">Análise AI por foto</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">100%</p>
                <p className="text-xs font-medium text-slate-500">Audit trail assinado</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">Nativo</p>
                <p className="text-xs font-medium text-slate-500">EU AI Act & RGPD</p>
              </div>
            </div>
          </div>

          {/* interactive FNOL simulator */}
          <div className="lg:col-span-6">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── Entradas: segurado + perito ──────────────────────────────── */}
      <section className="mx-auto mt-16 grid max-w-2xl gap-4 md:grid-cols-2">
        <CustomerEntry />
        <div className="card flex flex-col justify-center p-7">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Sou perito / seguradora</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Fila por deadline legal, análise com polígonos, sinais de fraude,
            decisão e auditoria — num só ecrã.
          </p>
          <Link href="/adjuster" className="btn-secondary mt-5 w-fit">
            Consola do perito →
          </Link>
        </div>
      </section>

      {/* ── O que acontece por dentro ────────────────────────────────── */}
      <section className="relative left-1/2 mt-20 w-screen -translate-x-1/2 border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              ⚙️ Motor interno da plataforma
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              O que acontece por dentro
            </h2>
            <p className="text-sm text-slate-600 sm:text-base">
              Tecnologia orientada a sinistros residenciais, comerciais e frotas.
              Intake correto à primeira tentativa e auditoria completa.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {MOTOR.map((c) => (
              <div key={c.t} className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:shadow-lg">
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl text-2xl transition-transform group-hover:scale-110 ${c.bg}`}>
                  {c.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{c.t}</h3>
                <p className="mb-3 text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">{c.d}</p>
                <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-500">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── A plataforma: 8 camadas ──────────────────────────────────── */}
      <section className="mx-auto mt-20 max-w-6xl lg:mt-24">
        <div className="mx-auto mb-10 max-w-3xl space-y-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#0369a1]">
            🧩 Arquitetura operacional
          </span>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            A operação completa, em 8 camadas
          </h2>
          <p className="text-sm text-slate-600 sm:text-base">
            Do aviso à recuperação — o que já está ativo e o que está a ser construído
          </p>
        </div>
        <LayersGrid />
      </section>

      {/* ── Conformidade — banda escura ──────────────────────────────── */}
      <section className="relative left-1/2 mt-20 w-screen -translate-x-1/2 overflow-hidden bg-slate-900 py-16 lg:mt-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-3xl space-y-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-sky-400">
              ⚖️ Conformidade legal integrada
            </span>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Conformidade e governação nativa
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              Desenhado desde a origem para cumprir as diretivas regulatórias europeias e nacionais.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {COMPLIANCE.map((c) => (
              <div key={c.t} className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 transition-all hover:border-[#0284c7]/50">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-3xl">{c.icon}</span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-extrabold uppercase text-emerald-400">
                    Nativo
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">{c.t}</h3>
                <p className="mb-4 text-sm font-medium leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">{c.hl}</span> — {c.d}
                </p>
                <p className="border-t border-slate-700/80 pt-3 text-xs text-slate-400">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────── */}
      <section className="mx-auto mt-20 max-w-3xl pb-10 text-center lg:mt-24">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          O sinistro seguinte pode ser o primeiro bem tratado.
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/fnol"
            className="btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#4f46e5] px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-xl sm:w-auto"
          >
            Reportar um sinistro
          </Link>
          <Link
            href="/adjuster"
            className="btn flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 sm:w-auto"
          >
            Sou perito
          </Link>
        </div>
      </section>
    </div>
  )
}
