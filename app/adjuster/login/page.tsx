'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) throw new Error('PIN inválido')
      router.push('/adjuster')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-12">
      <form onSubmit={submit} className="card p-8">
        <h1 className="text-xl font-bold">Consola do Perito</h1>
        <p className="mt-1 text-sm text-slate-500">Introduza o PIN de acesso.</p>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <input
          type="password"
          inputMode="numeric"
          className="input mt-5 text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        <button className="btn-primary mt-4 w-full" disabled={busy || !pin}>
          {busy ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
