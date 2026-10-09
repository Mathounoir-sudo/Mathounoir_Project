import type { ReactNode } from 'react'

export const inputClasses =
  'w-full min-h-12 rounded-2xl border border-line bg-bg px-3.5 text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 aria-[invalid=true]:border-danger'

interface Props {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  optional?: boolean
  children: ReactNode
}

/** Champ de formulaire accessible : libellé, aide et message d'erreur reliés au champ. */
export function Field({ id, label, hint, error, optional, children }: Props) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> (facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

/** Attributs à poser sur le champ pour le relier à son aide / erreur. */
export function describedBy(id: string, error?: string, hint?: unknown) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const
}
