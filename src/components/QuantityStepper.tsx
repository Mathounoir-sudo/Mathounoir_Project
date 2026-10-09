import { Minus, Plus } from 'lucide-react'
import type { Unit } from '../domain/types'
import { formatQuantity, stepFor } from '../domain/quantity'

interface Props {
  name: string
  quantity: number | null
  unit: Unit
  onStep: (direction: 1 | -1) => void
}

export function QuantityStepper({ name, quantity, unit, onStep }: Props) {
  if (quantity === null) return <span className="text-sm text-muted">Quantité inconnue</span>
  const step = formatQuantity(stepFor(unit), unit)
  const btn =
    'flex size-10 items-center justify-center rounded-full border border-line bg-card text-primary hover:bg-primary-soft disabled:opacity-40'
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`Quantité de ${name}`}>
      <button type="button" className={btn} onClick={() => onStep(-1)} disabled={quantity <= 0} aria-label={`Retirer ${step} de ${name}`}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-20 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {formatQuantity(quantity, unit)}
      </span>
      <button type="button" className={btn} onClick={() => onStep(1)} aria-label={`Ajouter ${step} à ${name}`}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
