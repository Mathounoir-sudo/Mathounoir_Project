import type { ReactNode } from 'react'
import type { Priority } from '../domain/priority'

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'primary'

const TONES: Record<Tone, string> = {
  neutral: 'bg-line/60 text-muted',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
  primary: 'bg-primary-soft text-primary',
}

export function Badge({ tone = 'neutral', children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function priorityBadge(p: Priority): { tone: Tone; label: string } {
  if (p.safety === 'do-not-eat') return { tone: 'danger', label: 'Ne pas consommer' }
  if (p.safety === 'check') return { tone: 'danger', label: 'À vérifier' }
  switch (p.level) {
    case 'high':
      return { tone: 'accent', label: 'À utiliser vite' }
    case 'medium':
      return { tone: 'warn', label: 'Bientôt' }
    case 'low':
      return { tone: 'ok', label: 'Pas urgent' }
    case 'uncertain':
      return { tone: 'neutral', label: 'Priorité incertaine' }
  }
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { tone, label } = priorityBadge(priority)
  return <Badge tone={tone}>{label}</Badge>
}
