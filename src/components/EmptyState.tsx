import type { ReactNode } from 'react'

export function EmptyState({ icon, title, children, actions }: { icon: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden="true">
        {icon}
      </div>
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm text-muted">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
