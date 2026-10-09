import type { Unit } from './types'

/**
 * Conversions d'unités FIABLES uniquement, à l'intérieur d'une même famille :
 * - masse : g, kg ;
 * - volume : ml, cl, l, et les cuillères de mesure (c. à s. = 15 ml, c. à c. = 5 ml) ;
 * - les unités de comptage (unité, tranche, boîte…) ne se convertissent jamais entre elles.
 * Aucune conversion masse ↔ volume : elle dépendrait de la densité de chaque ingrédient.
 */
type Dimension = 'mass' | 'volume'

const TO_BASE: Partial<Record<Unit, { dimension: Dimension; factor: number }>> = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  cl: { dimension: 'volume', factor: 10 },
  l: { dimension: 'volume', factor: 1000 },
  'c. à s.': { dimension: 'volume', factor: 15 },
  'c. à c.': { dimension: 'volume', factor: 5 },
}

/** Convertit une quantité d'une unité à une autre ; null si la conversion n'est pas fiable. */
export function convert(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to) return quantity
  const a = TO_BASE[from]
  const b = TO_BASE[to]
  if (!a || !b || a.dimension !== b.dimension) return null
  return (quantity * a.factor) / b.factor
}

export function canConvert(from: Unit, to: Unit): boolean {
  return convert(1, from, to) !== null
}

/**
 * Arrondi « de cuisine » après mise à l'échelle des portions :
 * - unités de comptage et cuillères : au demi le plus proche (jamais moins d'un demi) ;
 * - pincée : à l'unité (au moins une) ;
 * - grammes / millilitres : à 1 près sous 10, à 5 près sous 100, à 10 près au-delà ;
 * - centilitres : au demi sous 5, à l'unité au-delà ;
 * - kg / l : à 0,05 près.
 */
export function roundForKitchen(quantity: number, unit: Unit): number {
  if (quantity <= 0) return 0
  const to = (step: number) => Math.round(quantity / step) * step
  let rounded: number
  switch (unit) {
    case 'g':
    case 'ml':
      rounded = quantity < 10 ? to(1) : quantity < 100 ? to(5) : to(10)
      break
    case 'cl':
      rounded = quantity < 5 ? to(0.5) : to(1)
      break
    case 'kg':
    case 'l':
      rounded = to(0.05)
      break
    case 'pincée':
      rounded = to(1)
      break
    default:
      rounded = to(0.5)
  }
  // Une quantité positive n'est jamais arrondie à zéro.
  return Math.max(Math.round(rounded * 1000) / 1000, smallestStep(unit))
}

function smallestStep(unit: Unit): number {
  switch (unit) {
    case 'g':
    case 'ml':
    case 'pincée':
      return 1
    case 'cl':
      return 0.5
    case 'kg':
    case 'l':
      return 0.05
    default:
      return 0.5
  }
}

/** Quantité d'une recette pour un autre nombre de portions, arrondie pour la cuisine. */
export function scaleQuantity(quantity: number, unit: Unit, baseServings: number, servings: number): number {
  if (baseServings === servings) return quantity
  return roundForKitchen((quantity * servings) / baseServings, unit)
}
