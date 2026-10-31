import CustomerEntry from '@/components/customer-entry'
import Link from 'next/link'

const STEPS = [
  ['1', 'Reporte', 'FNOL guiado, ~2 min'],
  ['2', 'Fotos', 'slots guiados + vídeo'],
  ['3', 'Decisão', 'IA analisa, perito valida'],
] as const

export default function Home() {
  return (
    <div className="py-8 sm:py-12">
      {/* ── Hero — one message, one CTA ────────────────────────────── */}
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#6e6e73]">
          Gestão de sinistros
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1d1d1f] sm:text-4xl">
          Reporte o sinistro em&nbsp;2&nbsp;minutos.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[#6e6e73]">
          Envie fotos dos danos e acompanhe a decisão — sem login,
          sem telefonemas.
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href="/fnol" className="btn-primary w-full py-3.5 text-base sm:w-auto sm:px-10">
            Reportar um sinistro
          </Link>
          <Link href="/adjuster" className="text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f]">
            Sou perito →
          </Link>
        </div>

        <p className="mt-4 text-xs text-[#6e6e73]">
          Sem conta · sem apólice à mão · ligação segura por email
        </p>
      </div>

      {/* ── How it works — slim strip ──────────────────────────────── */}
      <ol className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-2 text-center">
        {STEPS.map(([n, t, d]) => (
          <li key={n} className="card px-3 py-4">
            <p className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-[#0e0e10] text-[11px] font-bold text-white">{n}</p>
            <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">{t}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#6e6e73]">{d}</p>
          </li>
        ))}
      </ol>

      {/* ── Secondary entry + adjuster ─────────────────────────────── */}
      <div className="mx-auto mt-8 grid max-w-xl gap-4 md:max-w-2xl md:grid-cols-2">
        <CustomerEntry />
        <div className="card flex flex-col justify-center p-6">
          <h3 className="font-bold text-[#1d1d1f]">Sou perito / seguradora</h3>
          <p className="mt-1 text-sm text-[#6e6e73]">
            Fila, análise com polígonos, fraude, decisão e auditoria.
          </p>
          <Link href="/adjuster" className="btn-secondary mt-4 w-fit">
            Consola do perito →
          </Link>
        </div>
      </div>

      {/* ── Processo efetivo — o que acontece por dentro ───────────── */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center text-lg font-bold tracking-tight text-[#1d1d1f]">
          O que acontece por dentro
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ['📋', 'FNOL guiado', 'Feridos, reboque, VIN, testemunhas — intake certo à 1ª'],
            ['📸', 'Deteção ONNX', '4 modelos, ~1,5s/foto — dano, peça, polígono, confiança'],
            ['🛡️', 'Fraude & SIU', 'EXIF, duplicados, qualidade — flag, nunca bloqueio'],
            ['📜', 'Audit trail', 'Cada ação assinada — IA, perito, sistema, cliente'],
          ].map(([icon, t, d]) => (
            <div key={t} className="card p-4">
              <p className="text-lg">{icon}</p>
              <p className="mt-1.5 text-xs font-bold text-[#1d1d1f]">{t}</p>
              <p className="mt-1 text-[11px] leading-snug text-[#6e6e73]">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compliance — as leis que o processo cumpre ─────────────── */}
      <div className="mx-auto mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
        {[
          ['EU AI Act', 'IA recomenda, humano decide — transparência por achado'],
          ['RGPD art. 22', 'Direito a revisão humana — nenhuma decisão 100% automática'],
          ['ASF', 'Tempos de resposta por SLA — prontos para auditoria'],
        ].map(([t, d]) => (
          <div key={t} className="card p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#1d1d1f]">{t}</p>
            <p className="mt-1 text-[11px] leading-snug text-[#6e6e73]">{d}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
