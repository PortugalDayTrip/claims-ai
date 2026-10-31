// Vision AI client — talks to an Ollama-compatible endpoint.
// SAME protocol as hospitality-platform/src/lib/ai-vision.ts.
// Configure via env:
//   AI_VISION_URL   (default http://localhost:11434)
//   AI_VISION_MODEL (default minicpm-v)
//   AI_VISION_TOKEN (optional bearer token if behind a proxy)

export const AI_VISION_URL = process.env.AI_VISION_URL ?? 'http://localhost:11434'
export const AI_VISION_MODEL = process.env.AI_VISION_MODEL ?? 'minicpm-v'
const AI_VISION_TOKEN = process.env.AI_VISION_TOKEN

interface OllamaChatResponse {
  message?: { content?: string }
  error?: string
}

export async function chat(images: string[], prompt: string, timeoutMs = 180_000): Promise<string> {
  const res = await fetch(`${AI_VISION_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AI_VISION_TOKEN ? { Authorization: `Bearer ${AI_VISION_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      model: AI_VISION_MODEL,
      stream: false,
      format: 'json',
      messages: [{ role: 'user', content: prompt, images }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) {
    throw new Error(`Vision API ${res.status}: ${await res.text().then((t) => t.slice(0, 300))}`)
  }
  const data = (await res.json()) as OllamaChatResponse
  if (data.error) throw new Error(`Vision API error: ${data.error}`)
  return data.message?.content ?? ''
}

export function toBase64(image: string): string {
  if (image.startsWith('data:')) return image.split(',', 2)[1]
  return image // assume already base64
}

export function extractJson<T>(raw: string, fallback: T): T {
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return fallback
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    return fallback
  }
}
