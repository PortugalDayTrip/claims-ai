// Prepare evidence images for VLM consumption.
// Research: models downscale internally anyway (LLaVA ~1024px cap); sending a
// 12MP phone photo wastes vision tokens (encode time scales with pixels) and
// base64 transfer. Resize once server-side → ~4× fewer tokens, ~10× smaller
// payload, identical damage-detection quality at our granularity.

import sharp from 'sharp'

const MAX_EDGE = Number(process.env.AI_VISION_MAX_EDGE ?? 1024)
const JPEG_QUALITY = Number(process.env.AI_VISION_JPEG_QUALITY ?? 78)

/**
 * Normalize an image buffer for the VLM: auto-rotate per EXIF, cap long edge,
 * re-encode as JPEG. Returns the prepared buffer + the downscale factor used
 * (useful if we ever need to map regions back to original pixels).
 */
export async function prepareForVlm(input: Buffer): Promise<{ buffer: Buffer; downscaled: boolean; origW?: number; origH?: number }> {
  const img = sharp(input, { failOn: 'none' }).rotate() // honor EXIF orientation
  const meta = await img.metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const needsResize = Math.max(w, h) > MAX_EDGE

  let pipeline = img
  if (needsResize) {
    pipeline = pipeline.resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
  }
  const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer()
  return { buffer, downscaled: needsResize, origW: w || undefined, origH: h || undefined }
}

/** Cheap probe — true when a buffer looks like a raster image sharp can read. */
export async function isRasterImage(buf: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buf).metadata()
    return !!meta.format
  } catch {
    return false
  }
}
