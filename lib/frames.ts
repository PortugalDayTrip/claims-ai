// Client-side video → keyframe extraction (browser <video> + canvas).
// Strategy per videosift research: uniform temporal sampling + sharpness
// scoring + perceptual-hash dedup. Zero server/ffmpeg dependency.

export interface ExtractedFrame {
  timeSec: number
  blob: Blob // JPEG
  previewUrl: string // object URL for UI
  sharpness: number
  hash: bigint // 64-bit aHash
}

const SAMPLE_EVERY_SEC = 2
const MAX_FRAMES = 12
const HASH_SIZE = 8
const DEDUP_HAMMING = 6
const MAX_EDGE = 1280 // cap capture — VLM downscales >1k anyway; halves upload size

function aHash(ctx: CanvasRenderingContext2D, w: number, h: number): bigint {
  // Draw to HASH_SIZE×HASH_SIZE grayscale, average, build 64-bit hash
  const tmp = document.createElement('canvas')
  tmp.width = HASH_SIZE
  tmp.height = HASH_SIZE
  const tctx = tmp.getContext('2d')!
  void w
  void h
  tctx.drawImage(ctx.canvas, 0, 0, HASH_SIZE, HASH_SIZE)
  const d = tctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE).data
  const grays: number[] = []
  for (let i = 0; i < d.length; i += 4) grays.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
  const avg = grays.reduce((a, b) => a + b, 0) / grays.length
  let hash = 0n
  for (let i = 0; i < grays.length; i++) {
    hash <<= 1n
    if (grays[i] >= avg) hash |= 1n
  }
  return hash
}

function hamming(a: bigint, b: bigint): number {
  let x = a ^ b
  let n = 0
  while (x) {
    n += Number(x & 1n)
    x >>= 1n
  }
  return n
}

function sharpnessScore(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  // Laplacian-variance proxy on a downscaled frame
  const S = 128
  const tmp = document.createElement('canvas')
  tmp.width = S
  tmp.height = Math.max(1, Math.round((S * h) / w))
  const tctx = tmp.getContext('2d')!
  tctx.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height)
  const { data, width, height } = tctx.getImageData(0, 0, tmp.width, tmp.height)
  const g = (x: number, y: number) => {
    const i = (y * width + x) * 4
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  let sum = 0
  let sum2 = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const lap = 4 * g(x, y) - g(x - 1, y) - g(x + 1, y) - g(x, y - 1) - g(x, y + 1)
      sum += lap
      sum2 += lap * lap
      count++
    }
  }
  if (!count) return 0
  const mean = sum / count
  return sum2 / count - mean * mean // variance
}

async function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    const onErr = () => {
      video.removeEventListener('error', onErr)
      reject(new Error('video seek failed'))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onErr, { once: true })
    video.currentTime = Math.min(t, Math.max(0, video.duration - 0.05))
  })
}

/**
 * Extract up to `maxFrames` diverse, sharp keyframes from a video file.
 * Uniform sampling + aHash dedup; keeps the sharpest of near-duplicates.
 */
export async function extractKeyframes(
  file: File,
  opts: { everySec?: number; maxFrames?: number; jpegQuality?: number } = {},
): Promise<ExtractedFrame[]> {
  const every = opts.everySec ?? SAMPLE_EVERY_SEC
  const maxFrames = opts.maxFrames ?? MAX_FRAMES
  const q = opts.jpegQuality ?? 0.82

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
      video.addEventListener('error', () => reject(new Error('Não foi possível ler o vídeo')), {
        once: true,
      })
    })

    const duration = video.duration
    if (!isFinite(duration) || duration <= 0) throw new Error('Duração inválida')

    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const step = Math.max(every, duration / (maxFrames * 1.5))
    const candidates: ExtractedFrame[] = []
    const hashes: bigint[] = []

    for (let t = 0.5; t < duration; t += step) {
      await seekTo(video, t)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const h = aHash(ctx, canvas.width, canvas.height)
      const s = sharpnessScore(ctx, canvas.width, canvas.height)

      // dedup: skip if too similar to an already accepted frame
      if (hashes.some((x) => hamming(x, h) <= DEDUP_HAMMING)) continue
      hashes.push(h)

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, 'image/jpeg', q),
      )
      if (!blob) continue
      candidates.push({ timeSec: Math.round(t * 10) / 10, blob, previewUrl: '', sharpness: s, hash: h })
    }

    // Keep sharpest maxFrames, preserving chronological order
    candidates.sort((a, b) => b.sharpness - a.sharpness)
    const picked = candidates.slice(0, maxFrames).sort((a, b) => a.timeSec - b.timeSec)
    for (const p of picked) p.previewUrl = URL.createObjectURL(p.blob)
    return picked
  } finally {
    URL.revokeObjectURL(url)
  }
}
