'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Home-page card: enter the claimant flow by pasting the secure link, or generate a demo claim. */
export default function CustomerEntry() {
  const router = useRouter()
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = () => {
    const v = link.trim()
    if (!v) return
    // accept full URL or bare token
    const m = v.match(/\/c\/([A-Za-z0-9]+)/)
    const token = m ? m[1] : v.replace(/[^A-Za-z0-9]/g, '')
    if (!token || token.length < 8) {
      setError('Ligação ou código inválido')
      return
    }
    router.push(`/c/${token}`)
  }

  const demo = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/demo', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')
      router.push(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setBusy(false)
    }
  }

  return (
    <div className="card flex flex-col justify-center p-6">
      <h3 className="font-bold text-[#1d1d1f]">Já tenho uma ligação</h3>
      <div className="mt-3 flex gap-2">
        <input
          className="input text-sm"
          placeholder="Colar ligação ou código"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && open()}
        />
        <button className="btn-secondary shrink-0" onClick={open}>Abrir</button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <button
        onClick={demo}
        disabled={busy}
        className="mt-4 w-fit text-xs font-medium text-[#6e6e73] underline decoration-dotted hover:text-[#1d1d1f]"
      >
        {busy ? 'A criar…' : '⚡ Sinistro de demonstração'}
      </button>
    </div>
  )
}
