/**
 * Préparation d'une recette : règles pures, sans base de données.
 *
 * Principes :
 * - rien n'est déduit sans confirmation : le moteur PROPOSE des quantités, l'utilisateur les vérifie et valide ;
 * - les quantités sont saisies dans l'unité du produit en stock (aucune conversion arbitraire, jamais g ↔ ml) ;
 * - impossible de déduire plus que la quantité connue (pas de stock négatif) ;
 * - une quantité inconnue ne peut pas être « réduite » : l'utilisateur choisit « ne rien déduire »
 *   ou « il n'en reste plus » ;
 * - les restes produits sont saisis par l'utilisateur (portions ou quantité) : 200 g de riz cru
 *   ne deviennent jamais automatiquement « 200 g de riz cuit ».
 */
import type { InventoryItem, Unit } from './types'
import type { LineEvaluation, RecipeEvaluation } from './recipe-engine'
import { computePriority } from './priority'
import { convert } from './units'
import { todayISO } from './dates'
import { formatQuantity } from './quantity'

export type UseMode =
  /** Déduire `quantity` (dans l'unité du produit). */
  | 'amount'
  /** Il n'en reste plus : le produit passe à 0 (ou le reste est consommé). */
  | 'finish'
  /** Ne rien déduire de ce produit. */
  | 'none'

export interface UsePlan {
  stockId: string
  stockKind: 'inventory' | 'leftover'
  ingredientId: string
  name: string
  unit: Unit
  /** Quantité en stock au moment de la proposition (null = inconnue). */
  available: number | null
  mode: UseMode
  /** Quantité à déduire quand mode = 'amount'. */
  quantity: number | null
  /** Pourquoi aucune quantité n'a été proposée, le cas échéant. */
  note?: string
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Produits concernés par une ligne de recette : ceux de la ligne, ou ceux du remplacement utilisé. */
function lineSources(line: LineEvaluation): { line: LineEvaluation; items: InventoryItem[] }[] {
  if (line.status === 'substituted' && line.substitution) return line.substitution.lines.map((l) => ({ line: l, items: l.items }))
  return [{ line, items: line.items }]
}

/**
 * Propose, pour chaque produit utilisé par la recette, une quantité à déduire.
 * Les produits les plus urgents (restes, dates proches) sont proposés en premier.
 * Les ingrédients facultatifs et les correspondances à confirmer ne sont pas proposés (mode « none »).
 */
export function suggestUses(
  evaluation: RecipeEvaluation,
  kindOf: (stockId: string) => 'inventory' | 'leftover',
  today: string = todayISO(),
): UsePlan[] {
  const plans: UsePlan[] = []
  for (const recipeLine of evaluation.lines) {
    for (const { line, items } of lineSources(recipeLine)) {
      const sorted = [...items].sort(
        (a, b) => computePriority(b, today).score - computePriority(a, today).score || a.id.localeCompare(b.id),
      )
      let remaining = line.quantity
      for (const item of sorted) {
        // Un même produit n'est proposé qu'une fois, même s'il sert à plusieurs lignes.
        if (plans.some((p) => p.stockId === item.id)) continue
        const plan: UsePlan = {
          stockId: item.id,
          stockKind: kindOf(item.id),
          ingredientId: line.ingredientId,
          name: item.name,
          unit: item.unit,
          available: item.quantity,
          mode: 'none',
          quantity: null,
        }
        if (recipeLine.optional) plan.note = 'Ingrédient facultatif : indiquez-le seulement si vous l’avez utilisé.'
        else if (line.uncertainty.includes('probable-match')) plan.note = 'Correspondance à confirmer avec cet ingrédient.'
        else if (item.quantity === null) plan.note = 'Quantité inconnue dans l’inventaire.'
        else if (line.quantity === null || line.unit === null) plan.note = 'Quantité « selon le goût » : indiquez ce que vous avez utilisé.'
        else if (remaining !== null && remaining > 0) {
          const inItemUnit = convert(remaining, line.unit, item.unit)
          if (inItemUnit === null) plan.note = `Unités différentes : indiquez la quantité utilisée en ${item.unit}.`
          else {
            const take = round2(Math.min(inItemUnit, item.quantity))
            if (take > 0) {
              plan.mode = 'amount'
              plan.quantity = take
              remaining = round2(remaining - (convert(take, item.unit, line.unit) ?? 0))
            }
          }
        }
        plans.push(plan)
      }
    }
  }
  return plans
}

export interface StockState {
  quantity: number | null
  unit: Unit
  name: string
}

/** Vérifie les quantités à déduire par rapport au stock ACTUEL. Renvoie un message par produit en erreur. */
export function validateUses(plans: UsePlan[], stock: ReadonlyMap<string, StockState>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const p of plans) {
    if (p.mode === 'none') continue
    const s = stock.get(p.stockId)
    if (!s) {
      errors[p.stockId] = `« ${p.name} » n’est plus dans votre inventaire : il a peut-être été modifié ou supprimé.`
      continue
    }
    if (p.mode === 'finish') continue
    if (p.quantity === null || !Number.isFinite(p.quantity) || p.quantity <= 0) {
      errors[p.stockId] = 'Indiquez une quantité positive, ou choisissez « Ne rien déduire ».'
    } else if (s.quantity === null) {
      errors[p.stockId] = 'Quantité inconnue dans l’inventaire : choisissez « Ne rien déduire » ou « Il n’en reste plus ».'
    } else if (p.quantity > s.quantity + 1e-9) {
      errors[p.stockId] = `Vous en avez ${formatQuantity(s.quantity, s.unit)} : impossible d’en déduire ${formatQuantity(p.quantity, s.unit)}. Corrigez la quantité, ou mettez d’abord à jour l’inventaire.`
    }
  }
  return errors
}

/** Nouvelle quantité d'un produit après déduction (jamais négative). */
export function applyUse(stockQuantity: number | null, plan: UsePlan): { quantity: number | null; deducted: number | null; finished: boolean } {
  if (plan.mode === 'finish') return { quantity: 0, deducted: stockQuantity, finished: true }
  if (plan.mode === 'none' || plan.quantity === null || stockQuantity === null) {
    return { quantity: stockQuantity, deducted: null, finished: false }
  }
  const next = Math.max(0, round2(stockQuantity - plan.quantity))
  return { quantity: next, deducted: plan.quantity, finished: next === 0 }
}

/** Vérifie les portions préparées et mangées. */
export function validatePortions(servings: number, eaten: number): string | null {
  if (!Number.isInteger(servings) || servings < 1) return 'Indiquez au moins une portion préparée.'
  if (!Number.isInteger(eaten) || eaten < 0) return 'Le nombre de portions mangées doit être un nombre entier.'
  if (eaten > servings) return `Vous ne pouvez pas avoir mangé plus de ${servings} portion${servings > 1 ? 's' : ''}.`
  return null
}
