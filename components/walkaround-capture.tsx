'use client'

// Guided walk-around video capture — distills the best OSS patterns:
// · Walkaround Inspector (PWA, SHA-256 on-device, chunked upload)
// · react-record-webcam (mime fallback, timeslice chunks, pause-aware timer)
// · mux/mediarecorder-streaming-uploads (timeslice + buffered chunks)
// · SiteSurvey Walk Cam (one instruction per screen, voice narration)
// Zero dependencies — getUserMedia + MediaRecorder + canvas only.

import { useCallback, useEffect, useRef, useState } from 'react'

export interface WalkaroundResult {
  file: File
  mimeType: string
  durationMs: number
  sha256: string
  stepsCompleted: number
}

type CarView = 'front' | 'rear' | 'side' | 'unknown'

interface GuideStep {
  label: string
  hint: string
  seconds: number
  view?: CarView // expected vehicle view for live verification
}

const STEPS_BY_ASSET: Record<string, GuideStep[]> = {
  vehicle: [
    { label: 'Frente do veículo', hint: 'Afaste-se ~2m — matrícula e para-choques visíveis', seconds: 8, view: 'front' },
    { label: 'Lado direito', hint: 'Caminhe devagar ao longo do lado direito, portas incluídas', seconds: 10, view: 'side' },
    { label: 'Traseira', hint: 'Matrícula e para-choques traseiro enquadrados', seconds: 8, view: 'rear' },
    { label: 'Lado esquerdo', hint: 'Caminhe ao longo do lado esquerdo até à frente', seconds: 10, view: 'side' },
    { label: 'Dano de perto', hint: 'Aproxime-se do dano — pode narrar o que vê', seconds: 12 },
  ],
  property: [
    { label: 'Vista geral', hint: 'Mostre a divisão/zona completa antes de aproximar', seconds: 12 },
    { label: 'Origem do dano', hint: 'Aponte para a origem — tubagem, telhado, aparelho', seconds: 12 },
    { label: 'Dano de perto', hint: 'Close-up estável — pode narrar o que vê', seconds: 12 },
  ],
  other: [
    { label: 'Contexto geral', hint: 'Mostre o bem e a zona envolvente', seconds: 10 },
    { label: 'Dano de perto', hint: 'Close-up estável — pode narrar o que vê', seconds: 12 },
  ],
}

const MIME_PREF = [
  'video/mp4; codecs="avc1.64003E, mp4a.40.2"',
  'video/mp4',
  'video/webm; codecs="vp9, opus"',
  'video/webm; codecs="vp8, opus"',
  'video/webm',
]

const MAX_MS = 120_000
const MIN_MS = 6_000
const TIMESLICE = 1_000

type Phase = 'idle' | 'live' | 'recording' | 'paused' | 'review' | 'error'

export default function WalkaroundCapture({
  assetType = 'other',
  onComplete,
  onCancel,
}: {
  assetType?: string
  onComplete: (r: WalkaroundResult) => void
  onCancel: () => void
}) {
  const steps = STEPS_BY_ASSET[assetType] ?? STEPS_BY_ASSET.other
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeRef = useRef('')
  const startedAtRef = useRef(0)
  const pausedMsRef = useRef(0)
  const pauseStartRef = useRef(0)
  const samplerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [stepIdx, setStepIdx] = useState(0)
  const [quality, setQuality] = useState<'ok' | 'dark' | 'blurry' | 'shake'>('ok')
  const [torchOn, setTorchOn] = useState(false)
  const [reviewUrl, setReviewUrl] = useState<string | null>(null)
  const reviewUrlRef = useRef<string | null>(null)
  const [result, setResult] = useState<WalkaroundResult | null>(null)
  const stepIdxRef = useRef(0)
  const stepOffsetRef = useRef(0) // ms added to elapsed when a step is view-confirmed early
  const viewRef = useRef<{ view: CarView; offline: boolean }>({ view: 'unknown', offline: false })
  const matchStreakRef = useRef(0)
  const [viewState, setViewState] = useState<{ view: CarView; match: boolean | null }>({ view: 'unknown', match: null })
  const [verifiedSteps, setVerifiedSteps] = useState<Set<number>>(new Set())

  // Recorder state is the source of truth — never React state inside timers/callbacks
  const elapsedMs = useCallback(() => {
    const base = Date.now() - startedAtRef.current - pausedMsRef.current
    const pausedNow = recRef.current?.state === 'paused' ? Date.now() - pauseStartRef.current : 0
    return Math.max(0, base - pausedNow)
  }, [])

  // Unmount-only cleanup — reads reviewUrl via ref so the effect never re-runs
  // mid-flow (a re-run on retake would kill the just-reopened camera stream)
  const cleanup = useCallback(() => {
    if (samplerRef.current) clearInterval(samplerRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (viewProbeRef.current) clearInterval(viewProbeRef.current)
    samplerRef.current = timerRef.current = viewProbeRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current)
    reviewUrlRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  // Live quality sampler — brightness + Laplacian variance + frame delta (shake)
  const startSampler = useCallback(() => {
    if (samplerRef.current) clearInterval(samplerRef.current) // no double sampler on retake
    const S = 96
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    let prev: Float32Array | null = null
    samplerRef.current = setInterval(() => {
      const v = videoRef.current
      if (!v || !v.videoWidth) return
      c.width = S
      c.height = Math.max(1, Math.round((S * v.videoHeight) / v.videoWidth))
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      const n = data.length / 4
      const g = new Float32Array(n)
      let lum = 0
      for (let i = 0; i < n; i++) {
        g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
        lum += g[i]
      }
      lum /= n
      // Laplacian variance (blur)
      let lapSum = 0, lapSq = 0, cnt = 0
      const w = c.width
      for (let y = 1; y < c.height - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x
          const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]
          lapSum += lap
          lapSq += lap * lap
          cnt++
        }
      }
      const lapVar = cnt ? lapSq / cnt - (lapSum / cnt) ** 2 : 0
      // Frame-to-frame delta (shake)
      let delta = 0
      if (prev && prev.length === n) {
        for (let i = 0; i < n; i += 4) delta += Math.abs(g[i] - prev[i])
        delta /= n / 4
      }
      prev = g
      if (lum < 35) setQuality('dark')
      else if (delta > 45) setQuality('shake')
      else if (lapVar < 60) setQuality('blurry')
      else setQuality('ok')
    }, 500)
  }, [])

  const openCamera = async () => {
    try {
      // Reuse a still-live stream (e.g. after a 'too short' error or retake)
      let stream = streamRef.current
      if (!stream || stream.getTracks().every((t) => t.readyState === 'ended')) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 24, max: 30 },
            },
            audio: true,
          })
        } catch {
          // Mic denied/unavailable must not kill the capture — retry video-only
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        }
        streamRef.current = stream
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      startSampler()
      setError(null)
      setPhase('live')
    } catch {
      setError('Sem acesso à câmara. Verifique as permissões do browser.')
      setPhase('error')
    }
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream) return
    const mime = MIME_PREF.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
    mimeRef.current = mime
    chunksRef.current = []
    try {
      const rec = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        videoBitsPerSecond: 4_000_000,
      })
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = finalize
      rec.start(TIMESLICE)
      recRef.current = rec
      startedAtRef.current = Date.now()
      pausedMsRef.current = 0
      setStepIdx(0)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        const ms = elapsedMs()
        setElapsed(ms)
        // advance step by cumulative seconds (+ offset from view-confirmed skips)
        const stepMs = ms + stepOffsetRef.current
        let acc = 0
        let idx = 0
        for (const s of steps) {
          acc += s.seconds * 1000
          if (stepMs < acc) break
          idx++
        }
        const next = Math.min(idx, steps.length - 1)
        stepIdxRef.current = next
        setStepIdx(next)
        if (ms >= MAX_MS) stopRecording()
      }, 250)
      if (assetType === 'vehicle') startViewProbe()
    } catch {
      setError('Este browser não consegue gravar vídeo. Tente o upload direto.')
      setPhase('error')
    }
  }

  const pauseRecording = () => {
    if (recRef.current?.state === 'recording') {
      recRef.current.pause()
      pauseStartRef.current = Date.now()
      setPhase('paused')
    }
  }

  const resumeRecording = () => {
    if (recRef.current?.state === 'paused') {
      recRef.current.resume()
      pausedMsRef.current += Date.now() - pauseStartRef.current
      setPhase('recording')
    }
  }

  // Live view probe — sends a small frame to /api/detect-view every ~2.5s.
  // Confirmed expected view 2× → auto-advance the step (marks it verified).
  const viewProbeRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const viewBusyRef = useRef(false)

  const startViewProbe = () => {
    if (viewProbeRef.current) clearInterval(viewProbeRef.current)
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    viewProbeRef.current = setInterval(async () => {
      const v = videoRef.current
      if (!v || !v.videoWidth || viewBusyRef.current) return
      viewBusyRef.current = true
      try {
        c.width = 480
        c.height = Math.max(1, Math.round((480 * v.videoHeight) / v.videoWidth))
        ctx.drawImage(v, 0, 0, c.width, c.height)
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.6))
        if (!blob) return
        const fd = new FormData()
        fd.append('file', blob, 'frame.jpg')
        const res = await fetch('/api/detect-view', { method: 'POST', body: fd, signal: AbortSignal.timeout(20_000) })
        const data = (await res.json()) as { view: CarView; offline?: boolean }
        viewRef.current = { view: data.view, offline: !!data.offline }

        const expected = steps[stepIdxRef.current]?.view
        if (!expected || data.offline) {
          matchStreakRef.current = 0
          setViewState({ view: data.view, match: null })
          return
        }
        const isMatch = data.view === expected
        setViewState({ view: data.view, match: isMatch })
        if (isMatch) {
          matchStreakRef.current++
          if (matchStreakRef.current >= 2) {
            // confirmed — mark verified, skip the rest of this step's clock time
            matchStreakRef.current = 0
            const cur = stepIdxRef.current
            setVerifiedSteps((s) => new Set(s).add(cur))
            const stepMs = elapsedMs() + stepOffsetRef.current
            let acc = 0
            for (const s of steps) { acc += s.seconds * 1000; if (stepMs < acc) break }
            stepOffsetRef.current += acc - stepMs // jump to next step boundary
          }
        } else {
          matchStreakRef.current = 0
        }
      } catch {
        viewRef.current = { view: 'unknown', offline: true }
        setViewState({ view: 'unknown', match: null })
      } finally {
        viewBusyRef.current = false
      }
    }, 2500)
  }

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== 'inactive') {
      // If stopping while paused, close out the pending pause segment first
      if (recRef.current.state === 'paused') {
        pausedMsRef.current += Date.now() - pauseStartRef.current
      }
      recRef.current.stop()
    }
  }

  const finalize = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (samplerRef.current) clearInterval(samplerRef.current)
    if (viewProbeRef.current) clearInterval(viewProbeRef.current)
    timerRef.current = samplerRef.current = viewProbeRef.current = null
    const ms = elapsedMs()
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'video/webm' })
    if (ms < MIN_MS || blob.size < 50_000) {
      setError(`Vídeo demasiado curto (${Math.round(ms / 1000)}s). Grave pelo menos ${MIN_MS / 1000}s.`)
      setPhase('error')
      return
    }
    // Stop the camera now — during review the LED stays off and the preview
    // switches to the recorded file. Retake re-opens via openCamera().
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `walkaround-${Date.now()}.${ext}`, { type: blob.type })
    let sha256 = ''
    try {
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
      sha256 = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      // non-secure context (http LAN dev) — hash unavailable
    }
    const url = URL.createObjectURL(blob)
    reviewUrlRef.current = url
    setReviewUrl(url)
    setResult({ file, mimeType: blob.type, durationMs: ms, sha256, stepsCompleted: stepIdxRef.current + 1 })
    setPhase('review')
  }

  const retake = () => {
    if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current)
    reviewUrlRef.current = null
    setReviewUrl(null)
    setResult(null)
    chunksRef.current = []
    setElapsed(0)
    stepIdxRef.current = 0
    stepOffsetRef.current = 0
    matchStreakRef.current = 0
    setStepIdx(0)
    setVerifiedSteps(new Set())
    setViewState({ view: 'unknown', match: null })
    void openCamera() // stream was stopped at finalize — reopen (or reuse if alive)
  }

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    const caps = track?.getCapabilities() as { torch?: boolean } | undefined
    if (!track || !caps?.torch) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(!torchOn)
    } catch {
      /* torch unsupported — ignore */
    }
  }

  const step = steps[stepIdx]
  const recording = phase === 'recording' || phase === 'paused'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* preview */}
      <video ref={videoRef} muted playsInline className="h-full w-full object-contain" />

      {/* review mode */}
      {phase === 'review' && reviewUrl && (
        <video src={reviewUrl} controls playsInline className="absolute inset-0 h-full w-full object-contain bg-black" />
      )}

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <button onClick={onCancel} className="rounded-full bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
          ✕ Cancelar
        </button>
        {recording && (
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur">
            <span className={`h-2.5 w-2.5 rounded-full ${phase === 'paused' ? 'bg-amber-400' : 'animate-pulse bg-red-500'}`} />
            <span className="font-mono text-sm text-white">{Math.floor(elapsed / 1000)}s</span>
          </div>
        )}
      </div>

      {/* step guidance */}
      {recording && step && (
        <div className="absolute inset-x-0 top-20 mx-auto w-fit max-w-[90%] rounded-2xl bg-black/60 px-5 py-3 text-center backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
            Passo {stepIdx + 1} de {steps.length}
          </p>
          <p className="mt-0.5 text-lg font-bold text-white">{step.label}</p>
          <p className="text-xs text-white/70">{step.hint}</p>
          <div className="mt-2 flex justify-center gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`h-1 w-8 rounded-full ${verifiedSteps.has(i) || i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-white' : 'bg-white/25'}`} />
            ))}
          </div>
          {viewState.match === true && (
            <p className="mt-1.5 text-xs font-semibold text-emerald-300">✓ Vista correta detetada</p>
          )}
          {viewState.match === false && step?.view && (
            <p className="mt-1.5 text-xs text-amber-300">
              A câmara mostra outra zona{viewState.view !== 'unknown' ? ` (${viewState.view === 'front' ? 'frente' : viewState.view === 'rear' ? 'traseira' : 'lateral'})` : ''} — aponte para: {step.label.toLowerCase()}
            </p>
          )}
        </div>
      )}

      {/* quality warning */}
      {recording && quality !== 'ok' && (
        <div className="absolute inset-x-0 top-44 mx-auto w-fit rounded-full bg-amber-500/90 px-4 py-1.5 text-xs font-semibold text-black">
          {quality === 'dark' && '💡 Ambiente escuro — ligue o flash ou mova-se para luz'}
          {quality === 'blurry' && '🎯 Imagem pouco nítida — aproxime-se e estabilize'}
          {quality === 'shake' && '✋ A mover demasiado rápido — abrande'}
        </div>
      )}

      {/* bottom controls */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        {phase === 'idle' && (
          <div className="text-center">
            <p className="mb-1 text-lg font-bold text-white">Vídeo guiado do bem</p>
            <p className="mb-5 text-sm text-white/70">
              {steps.length} passos · ~{steps.reduce((a, s) => a + s.seconds, 0)}s · pode narrar durante a gravação
            </p>
            <button onClick={openCamera} className="w-full max-w-xs rounded-full bg-emerald-500 py-4 font-bold text-white">
              Abrir câmara
            </button>
          </div>
        )}

        {phase === 'live' && (
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleTorch} className="rounded-full bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
              🔦 Flash
            </button>
            <button onClick={startRecording} className="h-20 w-20 rounded-full border-4 border-white bg-red-500 shadow-lg" aria-label="Gravar" />
          </div>
        )}

        {recording && (
          <div className="flex items-center justify-center gap-6">
            <button onClick={toggleTorch} className="rounded-full bg-white/10 px-4 py-3 text-sm text-white backdrop-blur">
              🔦
            </button>
            {phase === 'recording' ? (
              <button onClick={pauseRecording} className="rounded-full bg-white/10 px-5 py-3 text-white backdrop-blur">⏸</button>
            ) : (
              <button onClick={resumeRecording} className="rounded-full bg-amber-500 px-5 py-3 font-bold text-black">▶</button>
            )}
            <button onClick={stopRecording} className="h-16 w-16 rounded-2xl border-4 border-white bg-red-500" aria-label="Parar" />
          </div>
        )}

        {phase === 'review' && result && (
          <div className="text-center">
            <p className="mb-3 text-sm text-white/80">
              {Math.round(result.durationMs / 1000)}s · {(result.file.size / 1e6).toFixed(1)}MB · selado SHA-256
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={retake} className="rounded-full bg-white/15 px-6 py-3 font-semibold text-white backdrop-blur">
                ↺ Refazer
              </button>
              <button onClick={() => onComplete(result)} className="rounded-full bg-emerald-500 px-8 py-3 font-bold text-white">
                Usar este vídeo ✓
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center">
            <p className="mb-4 text-sm text-rose-300">{error}</p>
            <button onClick={openCamera} className="rounded-full bg-white/15 px-6 py-3 font-semibold text-white backdrop-blur">
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
