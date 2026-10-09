import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'

interface Props {
  title: string
  subtitle?: ReactNode
  back?: { to: string; label: string }
  action?: ReactNode
}

export function PageHeader({ title, subtitle, back, action }: Props) {
  return (
    <header className="mb-5">
      {back && (
        <Link to={back.to} className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 pr-3 font-semibold text-primary">
          <ChevronLeft className="size-5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
