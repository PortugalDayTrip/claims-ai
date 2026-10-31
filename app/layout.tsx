import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClaimsAI — Análise de Danos por IA',
  description: 'Avaliação automática de danos em sinistros a partir de fotos e vídeo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <a href="/" className="flex items-center gap-2 font-bold tracking-tight text-[#1d1d1f]">
              <span className="grid h-8 w-8 place-items-center rounded-[0.6rem] bg-[#0e0e10] text-sm font-extrabold text-white">C</span>
              ClaimsAI
            </a>
            <nav className="flex items-center gap-3 text-sm">
              <a href="/fnol" className="font-medium text-[#1d1d1f]/60 transition hover:text-[#1d1d1f]">
                Reportar sinistro
              </a>
              <a href="/adjuster" className="rounded-full bg-[#f2f2f7] px-4 py-2 font-semibold text-[#1d1d1f] transition hover:bg-[#e8e8ed]">
                Perito
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 text-[11px] leading-relaxed text-[#6e6e73]">
          ClaimsAI — análise assistida por IA com validação de perito humano.
          Evidências preservadas com hash SHA-256 · RGPD · Regulamento UE da IA.
        </footer>
      </body>
    </html>
  )
}
