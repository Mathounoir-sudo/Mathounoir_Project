import type { Unit } from './types'

/** Pas utilisé par les boutons + / − selon l'unité. */
export function stepFor(unit: Unit): number {
  switch (unit) {
    case 'g':
    case 'ml':
      return 50
    case 'cl':
      return 5
    case 'kg':
    case 'l':
      return 0.1
    default:
      return 1
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000

/** Augmente ou diminue d'un pas, sans descendre sous zéro. Une quantité inconnue reste inconnue. */
export function adjustQuantity(quantity: number | null, unit: Unit, direction: 1 | -1): number | null {
  if (quantity === null) return null
  return Math.max(0, round(quantity + direction * stepFor(unit)))
}

const PLURALS: Partial<Record<Unit, string>> = {
  unité: 'unités',
  portion: 'portions',
  tranche: 'tranches',
  pincée: 'pincées',
  boîte: 'boîtes',
  sachet: 'sachets',
  botte: 'bottes',
}

/** « 4 tranches », « 1,5 kg », « 2 unités », « Quantité inconnue ». */
export function formatQuantity(quantity: number | null, unit: Unit | null): string {
  if (quantity === null) return unit ? 'Quantité inconnue' : 'Selon le goût'
  const n = quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  if (!unit) return n
  return `${n} ${quantity > 1 ? (PLURALS[unit] ?? unit) : unit}`
}

/** Lit un nombre saisi au clavier français (« 1,5 ») ; null si vide ; NaN si invalide. */
export function parseQuantity(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN
}
