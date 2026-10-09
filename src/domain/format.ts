import type { Unit } from './types'

const PLURALS: Partial<Record<Unit, string>> = { tranche: 'tranches', pincée: 'pincées', boîte: 'boîtes' }

/** « 4 tranches », « 20 cl », « 2 » (pour des pièces), ou chaîne vide si pas de quantité. */
export function formatQuantity(quantity: number | null | undefined, unit: Unit | undefined): string {
  if (quantity === null || quantity === undefined) return ''
  const n = quantity.toLocaleString('fr-FR')
  if (!unit || unit === 'pièce') return n
  const label = quantity > 1 ? (PLURALS[unit] ?? unit) : unit
  return `${n} ${label}`
}
