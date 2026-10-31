import type { ClaimStatus, Severity, TriageVerdict } from '@/lib/types'

const SEV_STYLE: Record<string, string> = {
  minor: 'bg-emerald-100 text-emerald-800',
  moderate: 'bg-amber-100 text-amber-800',
  severe: 'bg-rose-100 text-rose-800',
  none: 'bg-slate-100 text-slate-500',
}
const SEV_LABEL: Record<string, string> = {
  minor: 'Menor',
  moderate: 'Moderado',
  severe: 'Severo',
  none: 'Sem danos',
}

export function SeverityBadge({ s }: { s: Severity | 'none' }) {
  return <span className={`badge ${SEV_STYLE[s]}`}>{SEV_LABEL[s]}</span>
}

const TRIAGE: Record<TriageVerdict, { label: string; cls: string }> = {
  stp_eligible: { label: 'Elegível STP', cls: 'bg-emerald-100 text-emerald-800' },
  manual_review: { label: 'Revisão manual', cls: 'bg-amber-100 text-amber-800' },
  siu_investigate: { label: 'Investigar (SIU)', cls: 'bg-rose-100 text-rose-800' },
}
export function TriageBadge({ v }: { v: TriageVerdict }) {
  const t = TRIAGE[v]
  return <span className={`badge ${t.cls}`}>{t.label}</span>
}

const STATUS_LABEL: Record<ClaimStatus, string> = {
  awaiting_evidence: 'A aguardar evidência',
  evidence_received: 'Evidência recebida',
  analyzing: 'A analisar',
  analyzed: 'Analisado',
  in_review: 'Em revisão',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  closed: 'Fechado',
}
export function StatusBadge({ s }: { s: ClaimStatus }) {
  const cls =
    s === 'approved'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'rejected'
        ? 'bg-rose-100 text-rose-800'
        : s === 'analyzing'
          ? 'bg-sky-100 text-sky-800 animate-pulse'
          : 'bg-slate-100 text-slate-600'
  return <span className={`badge ${cls}`}>{STATUS_LABEL[s]}</span>
}

export function FraudMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = pct >= 55 ? 'bg-rose-500' : pct >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Risco de fraude</span>
        <span className="font-bold text-slate-700">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
