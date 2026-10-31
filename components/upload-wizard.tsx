'use client'

import { extractKeyframes, type ExtractedFrame } from '@/lib/frames'
import WalkaroundCapture, { type WalkaroundResult } from '@/components/walkaround-capture'
import { useCallback, useMemo, useRef, useState } from 'react'

interface ClaimInfo {
  id: string
  status: string
  fnol: {
    claimantName: string
    assetType: string
    assetDescription?: string
    policyNumber?: string
    incidentType?: string
    incidentDate?: string
    incidentTime?: string
    incidentLocation?: string
    narrative?: string
    injuries?: boolean
    injuryDetail?: string
    drivable?: boolean
    needsTow?: boolean
    needsRental?: boolean
    vin?: string
    odometerKm?: number
    thirdPartyPlate?: string
    thirdPartyName?: string
    thirdPartyUninsured?: boolean
    witnesses?: string
    policeReport?: string
    circumstances?: string[]
    preferredContact?: string
  }
}

type Step = 'fnol' | 'evidence' | 'review' | 'done'

interface PendingVideo {
  file: File
  frames: ExtractedFrame[]
  extracting: boolean
  error?: string
}

const GUIDE: Record<string, string[]> = {
  vehicle: [
    'Vídeo: volta 360° ao carro devagar, depois pare 2–3s em cada dano',
    'Cubra as 8 vistas: frente, traseira, 2 laterais, tejadilho, rodas, interior',
    'Inclua a matrícula, o conta-quilómetros e o VIN (base do para-brisas)',
    'Fotografe cada dano de longe (contexto) e de perto com objeto de escala',
    'Em dia de sol: fotografe ao longo da carroçaria para revelar mossas',
  ],
  property: [
    'Vídeo: cada divisão afetada de ponta a ponta, depois aproxime-se do dano',
    'Telhado: filme de ângulos diferentes (drone ou do piso oposto, se seguro)',
    'Água/humidade: mostre a origem provável — teto, parede, canalização, janela',
    'Fotografe cada dano de longe (contexto da divisão) e de perto com régua/objeto de escala',
    'Fissuras: uma foto direta + uma foto em ângulo rasante com lanterna',
    'Inclua a fachada/vista da rua para confirmar a localização',
  ],
  contents: [
    'Fotografe cada item por inteiro e o dano em detalhe',
    'Inclua número de série/etiqueta/fatura quando visível',
    'Agrupe itens danificados na mesma foto quando possível',
  ],
  other: ['Filme o conjunto e depois cada dano em detalhe'],
}

/** Guided photo slots (CCC/ICBC vehicle standard — 9 shots). */
const PHOTO_SLOTS: { key: string; label: string; hint: string }[] = [
  { key: 'corner_front_l', label: 'Canto frontal esq.', hint: 'a ~3m do canto' },
  { key: 'corner_front_r', label: 'Canto frontal drt.', hint: 'a ~3m do canto' },
  { key: 'corner_rear_l',  label: 'Canto traseiro esq.', hint: 'a ~3m do canto' },
  { key: 'corner_rear_r',  label: 'Canto traseiro drt.', hint: 'a ~3m do canto' },
  { key: 'damage_close',   label: 'Dano de perto',     hint: 'cada dano em detalhe' },
  { key: 'damage_wide',    label: 'Dano em contexto',  hint: 'dano + painel inteiro' },
  { key: 'vin',            label: 'VIN',               hint: 'base do para-brisas ou porta' },
  { key: 'odometer',       label: 'Conta-quilómetros', hint: 'quadrante legível' },
  { key: 'plate',          label: 'Matrícula',          hint: 'traseira do veículo' },
]

export default function UploadWizard({ token, claim }: { token: string; claim: ClaimInfo }) {
  const [step, setStep] = useState<Step>(claim.status === 'evidence_received' || claim.status === 'analyzed' ? 'review' : 'fnol')
  const [fnol, setFnol] = useState({
    incidentDate: claim.fnol.incidentDate ?? '',
    incidentTime: claim.fnol.incidentTime ?? '',
    incidentLocation: claim.fnol.incidentLocation ?? '',
    incidentType: claim.fnol.incidentType ?? '',
    narrative: claim.fnol.narrative ?? '',
    injuries: claim.fnol.injuries ?? false,
    injuryDetail: claim.fnol.injuryDetail ?? '',
    drivable: claim.fnol.drivable ?? true,
    needsTow: claim.fnol.needsTow ?? false,
    needsRental: claim.fnol.needsRental ?? false,
    vin: claim.fnol.vin ?? '',
    odometerKm: claim.fnol.odometerKm ?? ('' as number | string),
    thirdPartyPlate: claim.fnol.thirdPartyPlate ?? '',
    thirdPartyName: claim.fnol.thirdPartyName ?? '',
    thirdPartyUninsured: claim.fnol.thirdPartyUninsured ?? false,
    circumstances: (claim.fnol.circumstances ?? []) as string[],
    witnesses: claim.fnol.witnesses ?? '',
    policeReport: claim.fnol.policeReport ?? '',
    preferredContact: claim.fnol.preferredContact ?? 'email',
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [slotPhotos, setSlotPhotos] = useState<Record<string, File[]>>({})
  const slotInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [videos, setVideos] = useState<PendingVideo[]>([])
  const [walkaround, setWalkaround] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)

  const guide = GUIDE[claim.fnol.assetType] ?? GUIDE.other
  const isVehicle = claim.fnol.assetType === 'vehicle'
  const totalFrames = useMemo(() => videos.reduce((n, v) => n + v.frames.length, 0), [videos])
  const totalSlotPhotos = useMemo(
    () => Object.values(slotPhotos).reduce((n, arr) => n + arr.length, 0),
    [slotPhotos],
  )
  const canSubmit = photos.length + totalFrames + totalSlotPhotos > 0 && !videos.some((v) => v.extracting)
  const slotsFilled = PHOTO_SLOTS.filter((s) => (slotPhotos[s.key]?.length ?? 0) > 0).length

  const addSlotPhotos = (slot: string, files: FileList | null) => {
    if (!files) return
    setSlotPhotos((p) => ({ ...p, [slot]: [...(p[slot] ?? []), ...Array.from(files)] }))
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    setPhotos((p) => [...p, ...Array.from(files)])
  }

  const addVideos = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const entry: PendingVideo = { file, frames: [], extracting: true }
      setVideos((v) => [...v, entry])
      try {
        const frames = await extractKeyframes(file)
        setVideos((v) =>
          v.map((x) => (x === entry ? { ...x, frames, extracting: false } : x)),
        )
      } catch (e) {
        setVideos((v) =>
          v.map((x) =>
            x === entry
              ? { ...x, extracting: false, error: e instanceof Error ? e.message : 'falha' }
              : x,
          ),
        )
      }
    }
  }, [])

  const removeFrame = (video: PendingVideo, frame: ExtractedFrame) => {
    setVideos((v) =>
      v.map((x) => (x === video ? { ...x, frames: x.frames.filter((f) => f !== frame) } : x)),
    )
    URL.revokeObjectURL(frame.previewUrl)
  }

  const saveFnol = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/c/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fnol, odometerKm: fnol.odometerKm === '' ? undefined : Number(fnol.odometerKm) }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erro ao guardar')
      setStep('evidence')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  const submitAll = async () => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      for (const p of photos) form.append('files', p, p.name)
      for (const [slot, files] of Object.entries(slotPhotos)) {
        for (const f of files) form.append(`file::${slot}`, f, f.name)
      }
      for (const v of videos) {
        form.append('files', v.file, v.file.name)
        for (const f of v.frames) {
          form.append(`frame::${v.file.name}::${f.timeSec}`, f.blob, `${v.file.name}_f${f.timeSec}s.jpg`)
        }
      }
      const res = await fetch(`/api/c/${token}/evidence`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha no envio')
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-3xl text-white shadow-lg shadow-emerald-500/30">✓</div>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-[#1d1d1f]">Evidência recebida</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73]">
          A nossa IA analisa já as fotos e os frames do vídeo — um perito revê o
          seu caso a seguir. Recebe novidades por email
          {claim.fnol.claimantName ? `, ${claim.fnol.claimantName.split(' ')[0]}` : ''}.
        </p>
        <p className="mt-5 inline-block rounded-full bg-[#f2f2f7] px-4 py-1.5 text-xs font-medium text-[#6e6e73]">Ref.: {claim.id}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress */}
      <ol className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
        {['Dados do sinistro', 'Fotos & vídeo', 'Rever & enviar'].map((s, i) => {
          const idx = ['fnol', 'evidence', 'review'].indexOf(step)
          return (
            <li key={s} className={`flex items-center gap-2 ${i <= idx ? 'text-brand-700' : ''}`}>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                  i <= idx ? 'bg-brand-600 text-white' : 'bg-slate-200'
                }`}
              >
                {i + 1}
              </span>
              {s}
              {i < 2 && <span className="h-px w-8 bg-slate-300" />}
            </li>
          )
        })}
      </ol>

      {error && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>}

      {step === 'fnol' && (
        <div className="space-y-5">
          {/* Confirmação prefilled — segurado confirma, não reescreve (Insly/Regure) */}
          <div className="card border-l-4 border-l-brand-500 p-5">
            <h2 className="text-lg font-bold">Confirme os seus dados</h2>
            <p className="mt-1 text-sm text-slate-600">
              <b>{claim.fnol.claimantName}</b> · {claim.fnol.assetDescription ?? claim.fnol.assetType}
              {claim.fnol.policyNumber ? ` · apólice ${claim.fnol.policyNumber}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">Se algo estiver errado, contacte-nos antes de continuar.</p>
          </div>

          {/* Incidente — coverage-triggering facts */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800">O incidente</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Data *</label>
                <input type="date" className="input" value={fnol.incidentDate}
                  onChange={(e) => setFnol({ ...fnol, incidentDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Hora (aprox.)</label>
                <input type="time" className="input" value={fnol.incidentTime}
                  onChange={(e) => setFnol({ ...fnol, incidentTime: e.target.value })} />
              </div>
              <div>
                <label className="label">Local</label>
                <input className="input" placeholder="Ex.: Lisboa, A2 km 30" value={fnol.incidentLocation}
                  onChange={(e) => setFnol({ ...fnol, incidentLocation: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <label className="label">Tipo de ocorrência</label>
                <select className="input" value={fnol.incidentType}
                  onChange={(e) => setFnol({ ...fnol, incidentType: e.target.value })}>
                  <option value="">Escolher…</option>
                  {['Colisão', 'Estacionamento (dano em veículo parado)', 'Granizo/tempestade', 'Inundação',
                    'Incêndio', 'Roubo/vandalismo', 'Queda de objeto', 'Rotura/fuga de água', 'Outro']
                    .map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="label">O que aconteceu? *</label>
                <textarea className="input min-h-[90px]" value={fnol.narrative}
                  placeholder="Ex.: Bateram-me na traseira enquanto estava parado no semáforo…"
                  onChange={(e) => setFnol({ ...fnol, narrative: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Sinal de urgência — injuries mudam todo o caminho do sinistro */}
          <div className={`card border-2 p-5 ${fnol.injuries ? 'border-rose-300 bg-rose-50' : 'border-transparent'}`}>
            <h3 className="font-semibold text-slate-800">Alguém ficou ferido?</h3>
            <p className="mt-1 text-xs text-slate-500">Dor, ambulância, hospital — mesmo que menor. É importante para a gestão do seu caso.</p>
            <div className="mt-3 flex gap-2">
              {[['Sim', true], ['Não', false]].map(([l, v]) => (
                <button key={String(v)} type="button"
                  onClick={() => setFnol({ ...fnol, injuries: v as boolean })}
                  className={`seg flex-1 ${fnol.injuries === v ? 'seg-on border-rose-400 text-rose-700' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            {fnol.injuries && (
              <textarea className="input mt-3 min-h-[60px] border-rose-200" value={fnol.injuryDetail}
                placeholder="Indique apenas quem ficou ferido (ex.: condutor, passageiro) — não precisa de descrever lesões nem diagnósticos."
                onChange={(e) => setFnol({ ...fnol, injuryDetail: e.target.value })} />
            )}
          </div>

          {/* Veículo — drivability + needs + identificação (só para motor) */}
          {isVehicle && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800">O seu veículo</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!fnol.drivable} onChange={(e) => setFnol({ ...fnol, drivable: !e.target.checked })} />
                    O veículo <b>não</b> consegue circular em segurança
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={fnol.needsTow} onChange={(e) => setFnol({ ...fnol, needsTow: e.target.checked })} />
                    Preciso de reboque
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={fnol.needsRental} onChange={(e) => setFnol({ ...fnol, needsRental: e.target.checked })} />
                    Preciso de veículo de substituição
                  </label>
                </div>
                <div>
                  <label className="label">VIN (opcional)</label>
                  <input className="input font-mono text-xs" maxLength={17} placeholder="17 caracteres — na base do para-brisas" value={fnol.vin}
                    onChange={(e) => setFnol({ ...fnol, vin: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="label">Quilómetros (opcional)</label>
                  <input type="number" className="input" placeholder="Ex.: 87 500" value={fnol.odometerKm}
                    onChange={(e) => setFnol({ ...fnol, odometerKm: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Circunstâncias do acidente (estilo DAAA — ramo automóvel) */}
          {isVehicle && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800">Circunstâncias do acidente</h3>
              <p className="mt-1 text-xs text-slate-500">Marque as que se aplicam — ajuda a determinar responsabilidade.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'Estacionado', 'Marcha-atrás', 'Mudança de faixa', 'Ultrapassagem',
                  'Cruzamento', 'Viragem', 'Colisão frontal', 'Embate traseiro',
                  'Saída de estacionamento', 'Animais/obstáculos',
                ].map((c) => {
                  const on = fnol.circumstances.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setFnol({
                          ...fnol,
                          circumstances: on
                            ? fnol.circumstances.filter((x) => x !== c)
                            : [...fnol.circumstances, c],
                        })
                      }
                      className={`seg ${on ? 'seg-on' : ''}`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Terceiros + responsabilidade — breadcrumbs legais */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800">Outros envolvidos e autoridades</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Matrícula do outro veículo</label>
                <input className="input font-mono" placeholder="Ex.: 12-AB-34" value={fnol.thirdPartyPlate}
                  onChange={(e) => setFnol({ ...fnol, thirdPartyPlate: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="label">Nome do outro condutor</label>
                <input className="input" value={fnol.thirdPartyName}
                  onChange={(e) => setFnol({ ...fnol, thirdPartyName: e.target.value })} />
              </div>
              <div>
                <label className="label">Testemunhas (nome + contacto)</label>
                <input className="input" value={fnol.witnesses}
                  onChange={(e) => setFnol({ ...fnol, witnesses: e.target.value })} />
              </div>
              <div>
                <label className="label">Nº auto polícia / DAAA</label>
                <input className="input" placeholder="Se a polícia foi chamada" value={fnol.policeReport}
                  onChange={(e) => setFnol({ ...fnol, policeReport: e.target.value })} />
              </div>
              {isVehicle && (
                <div className="sm:col-span-2">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={fnol.thirdPartyUninsured}
                      onChange={(e) => setFnol({ ...fnol, thirdPartyUninsured: e.target.checked })}
                    />
                    O outro veículo <b>não tinha seguro válido</b> ou não foi identificado
                  </label>
                  {fnol.thirdPartyUninsured && (
                    <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                      Nestes casos a indemnização é assegurada pelo <b>Fundo de Garantia
                      Automóvel</b>. A sua participação segue na mesma — nós tratamos
                      do encaminhamento junto da plataforma GPS/FGA.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contacto preferido */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800">Como prefere ser contactado?</h3>
            <div className="mt-3 flex gap-2">
              {[['email', '📧 Email'], ['phone', '📞 Telefone'], ['whatsapp', '💬 WhatsApp']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => setFnol({ ...fnol, preferredContact: v })}
                  className={`seg flex-1 ${fnol.preferredContact === v ? 'seg-on' : ''}`}>{l}</button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full" onClick={saveFnol} disabled={busy || !fnol.incidentDate || !fnol.narrative}>
            {busy ? 'A guardar…' : 'Continuar → Fotos'}
          </button>
        </div>
      )}

      {step === 'evidence' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-800">Como capturar boa evidência</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {guide.map((g) => <li key={g}>• {g}</li>)}
            </ul>
          </div>

          {/* Fotos guiadas — padrão CCC/ICBC: 9 slots que a seguradora precisa */}
          {isVehicle && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Fotos necessárias</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  slotsFilled >= 9 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>{slotsFilled}/9 cobertas</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PHOTO_SLOTS.map((s) => {
                  const files = slotPhotos[s.key] ?? []
                  return (
                    <div key={s.key} className={`rounded-lg border-2 p-3 text-center text-xs ${
                      files.length ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-slate-300'
                    }`}>
                      <p className="font-semibold text-slate-700">{s.label}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{s.hint}</p>
                      <button type="button" onClick={() => slotInputs.current[s.key]?.click()}
                        className={`mt-2 w-full rounded-md px-2 py-1.5 font-semibold ${
                          files.length ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {files.length ? `✓ ${files.length} foto(s)` : '+ foto'}
                      </button>
                      <input type="file" accept="image/*" multiple className="hidden"
                        ref={(el) => { slotInputs.current[s.key] = el }}
                        onChange={(e) => addSlotPhotos(s.key, e.target.files)} />
                      {files.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-1">
                          {files.map((f, i) => (
                            <div key={i} className="group relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={URL.createObjectURL(f)} alt={s.label}
                                className="aspect-square w-full rounded object-cover" />
                              <button type="button"
                                onClick={() => setSlotPhotos((p) => ({
                                  ...p, [s.key]: p[s.key].filter((_, j) => j !== i),
                                }))}
                                className="absolute -right-0.5 -top-0.5 hidden h-4 w-4 rounded-full bg-rose-600 text-[9px] text-white group-hover:block">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <button type="button" onClick={() => setWalkaround(true)}
              className="card border-2 border-dashed border-emerald-300 p-6 text-center hover:bg-emerald-50">
              <div className="text-3xl">🚶</div>
              <p className="mt-2 font-semibold text-slate-800">Vídeo guiado</p>
              <p className="mt-1 text-xs text-slate-500">Walk-around passo a passo — recomendado</p>
            </button>
            <button type="button" onClick={() => videoInput.current?.click()}
              className="card border-2 border-dashed border-brand-300 p-6 text-center hover:bg-brand-50">
              <div className="text-3xl">🎥</div>
              <p className="mt-2 font-semibold text-slate-800">Vídeo do dano</p>
              <p className="mt-1 text-xs text-slate-500">Extraímos automaticamente os melhores frames para a IA</p>
            </button>
            <button type="button" onClick={() => photoInput.current?.click()}
              className="card border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50">
              <div className="text-3xl">📷</div>
              <p className="mt-2 font-semibold text-slate-800">Fotos</p>
              <p className="mt-1 text-xs text-slate-500">JPG/PNG/HEIC — inclua close-ups do dano</p>
            </button>
          </div>
          <input ref={videoInput} type="file" accept="video/*" multiple className="hidden"
            onChange={(e) => addVideos(e.target.files)} />
          <input ref={photoInput} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => addPhotos(e.target.files)} />

          {videos.map((v) => (
            <div key={v.file.name} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{v.file.name}</p>
                {v.extracting && <span className="text-xs text-brand-600 animate-pulse">A extrair frames…</span>}
                {v.error && <span className="text-xs text-rose-600">{v.error}</span>}
                {!v.extracting && <span className="text-xs text-slate-500">{v.frames.length} frames selecionados</span>}
              </div>
              {v.frames.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {v.frames.map((f) => (
                    <div key={f.timeSec} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.previewUrl} alt={`frame ${f.timeSec}s`} className="aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200" />
                      <button type="button" onClick={() => removeFrame(v, f)}
                        className="absolute -right-1 -top-1 hidden h-5 w-5 rounded-full bg-rose-600 text-[10px] text-white group-hover:block">×</button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{f.timeSec}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {photos.length > 0 && (
            <div className="card p-4">
              <p className="text-sm font-semibold">{photos.length} foto(s)</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {photos.map((p, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(p)} alt={p.name} className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200" />
                    <button type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 hidden h-5 w-5 rounded-full bg-rose-600 text-[10px] text-white group-hover:block">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep('fnol')}>← Voltar</button>
            <button className="btn-primary flex-1" disabled={!canSubmit} onClick={() => setStep('review')}>
              Rever ({photos.length + totalFrames} itens) →
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold">Confirmar envio</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Sinistro</dt><dd>{fnol.incidentType || '—'} em {fnol.incidentDate || '—'}</dd></div>
            {fnol.injuries && <div className="flex justify-between"><dt className="text-slate-500">Feridos</dt><dd className="font-semibold text-rose-600">Sim</dd></div>}
            {isVehicle && <div className="flex justify-between"><dt className="text-slate-500">Slots de foto</dt><dd>{slotsFilled}/9 cobertos</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Fotos</dt><dd>{photos.length + totalSlotPhotos}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Vídeos</dt><dd>{videos.length} ({totalFrames} frames extraídos)</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Contacto</dt><dd>{fnol.preferredContact}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Ao enviar, declara que a evidência é autêntica e relativa a este sinistro.
            Os ficheiros ficam registados com assinatura criptográfica (SHA-256).
          </p>
          <div className="mt-5 flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep('evidence')}>← Editar</button>
            <button className="btn-primary flex-1" onClick={submitAll} disabled={busy}>
              {busy ? 'A enviar…' : 'Enviar para análise'}
            </button>
          </div>
        </div>
      )}

      {walkaround && (
        <WalkaroundCapture
          assetType={claim.fnol.assetType}
          onCancel={() => setWalkaround(false)}
          onComplete={(r: WalkaroundResult) => {
            setWalkaround(false)
            void addVideos([r.file])
          }}
        />
      )}
    </div>
  )
}
