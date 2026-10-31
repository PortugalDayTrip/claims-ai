// Fraud & evidence-integrity signals (Shift/Carpe patterns):
// - EXIF forensics (exifr): capture date/GPS/device/software vs claim facts
// - screenshot / no-EXIF heuristics (weak signal)
// - conflicting EXIF (strong signal)
// - sha256 duplicate detection within and across claims

import type { Claim, EvidenceItem, ExifSummary, FraudSignal, QualityFlags } from './types'

const DATE_TOLERANCE_MS = 1000 * 60 * 60 * 48 // ±48h
const GPS_TOLERANCE_KM = 150

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Crude PT geocoding: match well-known city names in the reported location string.
const KNOWN_CITIES: Record<string, [number, number]> = {
  lisboa: [38.7223, -9.1393],
  porto: [41.1579, -8.6291],
  braga: [41.5454, -8.4265],
  coimbra: [40.2033, -8.4103],
  faro: [37.0194, -7.9304],
  aveiro: [40.6443, -8.6455],
  setúbal: [38.5244, -8.8882],
  setubal: [38.5244, -8.8882],
  funchal: [32.6669, -16.9241],
  'vila real': [41.3003, -7.7441],
  guimarães: [41.4425, -8.2918],
  guimaraes: [41.4425, -8.2918],
  cascais: [38.6979, -9.4215],
  sintra: [38.8029, -9.3817],
  oeiras: [38.691, -9.31],
  almada: [38.6794, -9.1569],
  algarve: [37.0179, -7.9304],
  leiria: [39.7436, -8.8071],
  évora: [38.5714, -7.9135],
  evora: [38.5714, -7.9135],
}

function locationToCoords(location?: string): [number, number] | null {
  if (!location) return null
  const l = location.toLowerCase()
  for (const [city, coords] of Object.entries(KNOWN_CITIES)) if (l.includes(city)) return coords
  return null
}

export async function extractExif(buf: Buffer): Promise<ExifSummary> {
  try {
    const exifr = await import('exifr')
    const data = await exifr.parse(buf, {
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model', 'Software', 'latitude', 'longitude'],
      gps: true,
    })
    if (!data) return { hasExif: false }
    const captured = data.DateTimeOriginal ?? data.CreateDate
    const device = [data.Make, data.Model].filter(Boolean).join(' ') || undefined
    return {
      hasExif: true,
      capturedAt: captured ? new Date(captured).toISOString() : undefined,
      gpsLat: typeof data.latitude === 'number' ? data.latitude : undefined,
      gpsLng: typeof data.longitude === 'number' ? data.longitude : undefined,
      device,
      software: data.Software,
    }
  } catch {
    return { hasExif: false }
  }
}

export function qualityFlags(item: EvidenceItem): QualityFlags {
  const flags: string[] = []
  const noExif = item.kind !== 'frame' && !(item.exif?.hasExif)
  const isLikelyScreenshot =
    item.mimeType === 'image/png' && !item.exif?.hasExif && !item.exif?.device
  if (noExif) flags.push('Sem metadados EXIF (possível screenshot ou exportação)')
  if (isLikelyScreenshot) flags.push('PNG sem dados de câmara — padrão típico de screenshot')
  if (item.exif?.software) flags.push(`Software de edição detetado: ${item.exif.software}`)
  return { isLikelyScreenshot, noExif, flags }
}

export function fraudSignals(claim: Claim): FraudSignal[] {
  const signals: FraudSignal[] = []
  const incident = claim.fnol.incidentDate ? new Date(claim.fnol.incidentDate).getTime() : null
  const claimCoords = locationToCoords(claim.fnol.incidentLocation)
  const seen = new Map<string, string>() // sha256 -> evidenceId

  for (const e of claim.evidence) {
    if (e.kind === 'video') continue // frames carry the forensic weight
    const label = e.kind === 'frame' ? `frame ${e.frameTimeSec ?? '?'}s` : e.fileName

    // EXIF vs claim date
    if (incident && e.exif?.capturedAt) {
      const diff = Math.abs(new Date(e.exif.capturedAt).getTime() - incident)
      if (diff > DATE_TOLERANCE_MS) {
        const days = Math.round(diff / 86400000)
        signals.push({
          code: 'exif_date_mismatch',
          weight: Math.min(0.4, 0.15 + days * 0.02),
          detail: `${label}: foto capturada ${days} dia(s) fora da data reportada do sinistro`,
        })
      }
    }

    // EXIF GPS vs reported location
    if (claimCoords && e.exif?.gpsLat != null && e.exif?.gpsLng != null) {
      const km = haversineKm(claimCoords[0], claimCoords[1], e.exif.gpsLat, e.exif.gpsLng)
      if (km > GPS_TOLERANCE_KM) {
        signals.push({
          code: 'exif_gps_mismatch',
          weight: 0.35,
          detail: `${label}: GPS da foto a ~${Math.round(km)} km da localização reportada`,
        })
      }
    }

    if (e.quality?.noExif) {
      signals.push({
        code: 'no_exif',
        weight: 0.05,
        detail: `${label}: sem EXIF (fraco — comum em screenshots/reenvios)`,
      })
    }
    if (e.quality?.isLikelyScreenshot) {
      signals.push({
        code: 'likely_screenshot',
        weight: 0.08,
        detail: `${label}: padrão de screenshot`,
      })
    }
    if (e.findings && !e.findings.isRealPhoto) {
      signals.push({
        code: 'not_a_photo',
        weight: 0.5,
        detail: `${label}: ${e.findings.photoConcern ?? 'não parece fotografia real'}`,
      })
    }
    if (e.findings?.imageQuality === 'poor') {
      signals.push({
        code: 'low_quality',
        weight: 0.05,
        detail: `${label}: qualidade fraca — ${e.findings.qualityIssues.join(', ') || 'n/d'}`,
      })
    }
    const preExisting = e.findings?.findings.filter((f) => f.preExisting) ?? []
    for (const f of preExisting) {
      signals.push({
        code: 'possible_preexisting',
        weight: 0.15,
        detail: `${label}: '${f.damageType}' em ${f.location} com sinais de dano pré-existente`,
      })
    }

    // Duplicates
    const prev = seen.get(e.sha256)
    if (prev) {
      signals.push({
        code: 'duplicate_in_claim',
        weight: 0.1,
        detail: `${label}: ficheiro duplicado dentro do sinistro`,
      })
    }
    seen.set(e.sha256, e.id)
  }
  return signals
}

export async function crossClaimDuplicates(claimId: string, hashes: string[]) {
  const { db } = await import('./db')
  const signals: FraudSignal[] = []
  for (const h of hashes) {
    const hits = await db.findByHash(h)
    const others = hits.filter((x) => x.claimId !== claimId)
    if (others.length > 0) {
      signals.push({
        code: 'duplicate_cross_claim',
        weight: 0.5,
        detail: `Imagem idêntica já submetida no sinistro ${others[0].claimId}`,
      })
    }
  }
  return signals
}

export function fraudScore(signals: FraudSignal[]): number {
  // Noisy-OR combination — multiple weak signals compound but never auto-convict.
  let p = 0
  for (const s of signals) p = 1 - (1 - p) * (1 - s.weight)
  return Math.round(p * 100) / 100
}
