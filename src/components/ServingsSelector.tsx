import { Minus, Plus, Users } from 'lucide-react'
import { MAX_SERVINGS, MIN_SERVINGS } from '../services/preferences'

interface Props {
  value: number
  onChange: (servings: number) => void
  /** Recette dont les quantités ne s'ajustent pas : le sélecteur est remplacé par une explication. */
  lockedAt?: number
}

/** Choix du nombre de portions (1 à 8). Ne modifie jamais l'inventaire. */
export function ServingsSelector({ value, onChange, lockedAt }: Props) {
  if (lockedAt !== undefined) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-line/40 px-4 py-3 text-sm">
        <Users className="size-4 shrink-0 text-muted" aria-hidden="true" />
        Recette pour {lockedAt} portions : ses quantités ne s’ajustent pas (moule, cuisson).
      </p>
    )
  }
  const btn =
    'flex size-11 items-center justify-center rounded-full border border-line bg-card text-primary hover:bg-primary-soft disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-card px-4 py-2" role="group" aria-label="Nombre de portions">
      <span className="flex items-center gap-2 font-semibold">
        <Users className="size-5 text-primary" aria-hidden="true" />
        <span aria-live="polite">
          Pour {value} {value > 1 ? 'portions' : 'portion'}
        </span>
      </span>
      <span className="flex gap-2">
        <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= MIN_SERVINGS} aria-label="Une portion de moins">
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= MAX_SERVINGS} aria-label="Une portion de plus">
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}
