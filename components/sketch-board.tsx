'use client'

import { useRef, useState } from 'react'

// ── DAAA sketch objects — e-Constat style drag-and-drop + freehand pen ────────

export type SketchObjType =
  | 'car_a' | 'car_b' | 'arrow' | 'road' | 'stop' | 'warn' | 'ped' | 'tree'

export interface SketchObj {
  id: number
  type: SketchObjType
  x: number // normalized 0..1
  y: number
  rot: number // degrees
}

const PALETTE: { type: SketchObjType; label: string; icon: string }[] = [
  { type: 'car_a', label: 'Veículo A', icon: '🚙' },
  { type: 'car_b', label: 'Veículo B', icon: '🚗' },
  { type: 'arrow', label: 'Seta', icon: '➡️' },
  { type: 'road', label: 'Via', icon: '➖' },
  { type: 'stop', label: 'STOP', icon: '🛑' },
  { type: 'warn', label: 'Perigo', icon: '⚠️' },
  { type: 'ped', label: 'Peão', icon: '🚶' },
  { type: 'tree', label: 'Árvore', icon: '🌳' },
]

const W = 700
const H = 340

// Vector renderers — used for DOM preview AND PNG rasterization (single source).
function drawObj(ctx: CanvasRenderingContext2D, o: SketchObj, selected: boolean) {
  ctx.save()
  ctx.translate(o.x * W, o.y * H)
  ctx.rotate((o.rot * Math.PI) / 180)
  switch (o.type) {
    case 'car_a':
    case 'car_b': {
      const col = o.type === 'car_a' ? '#2563eb' : '#d97706'
      ctx.fillStyle = col
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.5
      // top-view car
      roundRect(ctx, -14, -26, 28, 52, 9)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,.75)'
      roundRect(ctx, -10, -16, 20, 10, 3)
      ctx.fill()
      roundRect(ctx, -10, 6, 20, 9, 3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(o.type === 'car_a' ? 'A' : 'B', 0, -2)
      break
    }
    case 'arrow': {
      ctx.strokeStyle = '#dc2626'
      ctx.fillStyle = '#dc2626'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(-26, 0)
      ctx.lineTo(18, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(26, 0)
      ctx.lineTo(12, -8)
      ctx.lineTo(12, 8)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'road': {
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.moveTo(-70, 0)
      ctx.lineTo(70, 0)
      ctx.stroke()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.setLineDash([12, 10])
      ctx.beginPath()
      ctx.moveTo(-70, 0)
      ctx.lineTo(70, 0)
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'stop': {
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.arc(0, 0, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 8px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('STOP', 0, 0)
      break
    }
    case 'warn': {
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.moveTo(0, -16)
      ctx.lineTo(15, 12)
      ctx.lineTo(-15, 12)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 14px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', 0, 3)
      break
    }
    case 'ped': {
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(0, -12, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, -7)
      ctx.lineTo(0, 8)
      ctx.moveTo(0, -4)
      ctx.lineTo(-8, 3)
      ctx.moveTo(0, -4)
      ctx.lineTo(8, 3)
      ctx.moveTo(0, 8)
      ctx.lineTo(-7, 18)
      ctx.moveTo(0, 8)
      ctx.lineTo(7, 18)
      ctx.stroke()
      break
    }
    case 'tree': {
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(0, -6, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#854d0e'
      ctx.fillRect(-2, 6, 4, 12)
      break
    }
  }
  if (selected) {
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.arc(0, 0, 34, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

let nid = 1

export default function SketchBoard({ onChange }: { onChange: (dataUrl: string | undefined) => void }) {
  const boardRef = useRef<HTMLDivElement>(null)
  const penRef = useRef<HTMLCanvasElement>(null)
  const [objs, setObjs] = useState<SketchObj[]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [penMode, setPenMode] = useState(false)
  const [hasPen, setHasPen] = useState(false)
  const drawing = useRef(false)
  const dragOff = useRef({ dx: 0, dy: 0 })

  const emit = (list: SketchObj[]) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    // faint grid like the paper form
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 1
    for (let gx = 0; gx < W; gx += 35) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
    }
    for (let gy = 0; gy < H; gy += 34) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
    }
    for (const o of list) drawObj(ctx, o, false)
    if (penRef.current) ctx.drawImage(penRef.current, 0, 0)
    onChange(list.length || hasPen ? c.toDataURL('image/png') : undefined)
  }

  const addObj = (type: SketchObjType) => {
    const o: SketchObj = { id: nid++, type, x: 0.5, y: 0.5, rot: 0 }
    const list = [...objs, o]
    setObjs(list)
    setSel(o.id)
    emit(list)
  }

  const boardPos = (e: React.PointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  const onObjDown = (e: React.PointerEvent, id: number) => {
    e.stopPropagation()
    setSel(id)
    const o = objs.find((x) => x.id === id)!
    const p = boardPos(e)
    dragOff.current = { dx: o.x - p.x, dy: o.y - p.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onObjMove = (e: React.PointerEvent, id: number) => {
    if (e.buttons !== 1) return
    const p = boardPos(e)
    const list = objs.map((o) =>
      o.id === id
        ? { ...o, x: Math.min(0.97, Math.max(0.03, p.x + dragOff.current.dx)), y: Math.min(0.95, Math.max(0.05, p.y + dragOff.current.dy)) }
        : o,
    )
    setObjs(list)
  }

  const onObjUp = () => emit(objs)

  const rotateSel = (deg: number) => {
    if (sel == null) return
    const list = objs.map((o) => (o.id === sel ? { ...o, rot: (o.rot + deg + 360) % 360 } : o))
    setObjs(list)
    emit(list)
  }

  const removeSel = () => {
    if (sel == null) return
    const list = objs.filter((o) => o.id !== sel)
    setObjs(list)
    setSel(null)
    emit(list)
  }

  // Freehand pen layer
  const penPos = (e: React.PointerEvent) => {
    const r = penRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }
  }
  const penDown = (e: React.PointerEvent) => {
    if (!penMode) return
    drawing.current = true
    const ctx = penRef.current!.getContext('2d')!
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.beginPath()
    const p = penPos(e)
    ctx.moveTo(p.x, p.y)
    penRef.current!.setPointerCapture(e.pointerId)
  }
  const penMove = (e: React.PointerEvent) => {
    if (!drawing.current || !penMode) return
    const ctx = penRef.current!.getContext('2d')!
    const p = penPos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setHasPen(true)
  }
  const penUp = () => {
    drawing.current = false
    emit(objs)
  }
  const clearPen = () => {
    penRef.current!.getContext('2d')!.clearRect(0, 0, W, H)
    setHasPen(false)
    emit(objs)
  }

  const selected = objs.find((o) => o.id === sel)

  return (
    <div>
      {/* Palette */}
      <div className="flex flex-wrap gap-1.5">
        {PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => addObj(p.type)}
            title={p.label}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:border-brand-400 hover:bg-brand-50"
          >
            {p.icon}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPenMode(!penMode)}
          className={`rounded-lg border px-2.5 py-1.5 text-sm ${penMode ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
          title="Desenho livre"
        >
          ✏️
        </button>
        {hasPen && (
          <button type="button" onClick={clearPen} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400">
            apagar traços
          </button>
        )}
      </div>

      {/* Selected-object toolbar */}
      {selected && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs">
          <span className="font-medium text-brand-800">{PALETTE.find((p) => p.type === selected.type)?.label}</span>
          <button type="button" onClick={() => rotateSel(-45)} className="rounded bg-white px-2 py-0.5 border">↺45°</button>
          <button type="button" onClick={() => rotateSel(45)} className="rounded bg-white px-2 py-0.5 border">↻45°</button>
          <button type="button" onClick={removeSel} className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">apagar</button>
          <span className="ml-auto text-slate-400">arraste para posicionar</span>
        </div>
      )}

      {/* Board */}
      <div
        ref={boardRef}
        className="relative mt-2 aspect-[700/340] w-full touch-none overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
        style={{
          backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
          backgroundSize: '5% 10%',
        }}
        onPointerDown={() => setSel(null)}
      >
        {objs.map((o) => (
          <div
            key={o.id}
            onPointerDown={(e) => onObjDown(e, o.id)}
            onPointerMove={(e) => onObjMove(e, o.id)}
            onPointerUp={onObjUp}
            className="absolute cursor-move select-none"
            style={{
              left: `${o.x * 100}%`,
              top: `${o.y * 100}%`,
              transform: `translate(-50%,-50%) rotate(${o.rot}deg)`,
            }}
          >
            <ObjectPreview obj={o} selected={o.id === sel} />
          </div>
        ))}
        <canvas
          ref={penRef}
          width={W}
          height={H}
          onPointerDown={penDown}
          onPointerMove={penMove}
          onPointerUp={penUp}
          onPointerLeave={penUp}
          className={`absolute inset-0 h-full w-full ${penMode ? 'cursor-crosshair' : 'pointer-events-none'}`}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {penMode ? '✏️ Modo desenho livre ativo — desenhe com o dedo' : 'Toque num objeto da paleta e arraste-o. Toque num objeto para rodar/apagar.'}
      </p>
    </div>
  )
}

/** DOM preview of an object — mirrors drawObj so the board matches the export. */
function ObjectPreview({ obj, selected }: { obj: SketchObj; selected: boolean }) {
  const ring = selected ? 'outline outline-2 outline-dashed outline-brand-500 rounded-full' : ''
  switch (obj.type) {
    case 'car_a':
    case 'car_b':
      return (
        <div className={`grid h-14 w-8 place-items-center rounded-lg border-2 border-slate-700 ${obj.type === 'car_a' ? 'bg-blue-600' : 'bg-amber-600'} ${ring}`}>
          <span className="text-xs font-bold text-white">{obj.type === 'car_a' ? 'A' : 'B'}</span>
        </div>
      )
    case 'arrow':
      return <div className={`text-3xl text-rose-600 ${ring}`}>➡️</div>
    case 'road':
      return <div className={`h-5 w-36 rounded-sm bg-slate-500 ${ring}`}><div className="mx-auto mt-2 h-0.5 w-full bg-white" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 8px, transparent 8px 16px)' }} /></div>
    case 'stop':
      return <div className={`grid h-8 w-8 place-items-center rounded-full bg-rose-600 text-[8px] font-bold text-white ${ring}`}>STOP</div>
    case 'warn':
      return <div className={`text-2xl ${ring}`}>⚠️</div>
    case 'ped':
      return <div className={`text-2xl ${ring}`}>🚶</div>
    case 'tree':
      return <div className={`text-2xl ${ring}`}>🌳</div>
  }
}
