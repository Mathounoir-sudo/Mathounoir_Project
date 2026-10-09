import type { CatalogIngredient, InventoryItem, Recipe, RecipeIngredient } from './types'
import { computePriority } from './priority'
import { todayISO } from './dates'

export type LineStatus =
  /** Présent dans l'inventaire en quantité suffisante (ou basique confirmé). */
  | 'available'
  /** Présent mais quantité insuffisante (même unité). */
  | 'insufficient'
  /** Présent, mais quantité inconnue ou unités différentes : à vérifier. */
  | 'unverified'
  /** Absent de l'inventaire. */
  | 'missing'

export interface RecipeLine {
  ingredient: RecipeIngredient
  status: LineStatus
  items: InventoryItem[]
  /** Quantité disponible, quand elle est comparable à celle demandée. */
  have: number | null
}

export interface RecipeMatch {
  recipe: Recipe
  lines: RecipeLine[]
  /** Ingrédients obligatoires absents ou en quantité insuffisante. */
  missing: RecipeLine[]
  /** Ingrédients présents dont la quantité ne peut pas être vérifiée. */
  unverified: RecipeLine[]
  /** Produits prioritaires que la recette permet d'utiliser. */
  usesPriority: InventoryItem[]
  /** Nombre de produits de l'inventaire utilisés (hors basiques). */
  usedCount: number
  /** Vrai seulement si tous les ingrédients obligatoires sont présents en quantité suffisante ou à vérifier. */
  feasible: boolean
  score: number
}

export interface MatchOptions {
  /** Basiques (sel, huile…) que l'utilisateur a confirmé avoir. */
  staples: ReadonlySet<string>
  today?: string
}

/** Les produits à ne pas consommer ou à vérifier ne sont jamais proposés, ni les produits épuisés. */
export function usableItems(inventory: InventoryItem[], today: string): InventoryItem[] {
  return inventory.filter((i) => i.quantity !== 0 && computePriority(i, today).safety === 'ok')
}

export function matchRecipe(
  recipe: Recipe,
  inventory: InventoryItem[],
  catalog: ReadonlyMap<string, CatalogIngredient>,
  { staples, today = todayISO() }: MatchOptions,
): RecipeMatch {
  const usable = usableItems(inventory, today)
  const lines: RecipeLine[] = recipe.ingredients.map((ri) => {
    const isStaple = catalog.get(ri.ingredientId)?.category === 'staple'
    const items = usable.filter((i) => i.ingredientId === ri.ingredientId)
    if (items.length === 0) {
      return { ingredient: ri, items, have: null, status: isStaple && staples.has(ri.ingredientId) ? 'available' : 'missing' }
    }
    if (ri.quantity === null) return { ingredient: ri, items, have: null, status: 'available' }
    const comparable = items.filter((i) => i.quantity !== null && i.unit === ri.unit)
    if (comparable.length === 0) return { ingredient: ri, items, have: null, status: 'unverified' }
    const have = comparable.reduce((sum, i) => sum + (i.quantity ?? 0), 0)
    if (have >= ri.quantity) return { ingredient: ri, items, have, status: 'available' }
    // Une partie des produits a une autre unité : on ne peut pas conclure.
    if (comparable.length < items.length) return { ingredient: ri, items, have, status: 'unverified' }
    return { ingredient: ri, items, have, status: 'insufficient' }
  })

  const required = lines.filter((l) => !l.ingredient.optional)
  const missing = required.filter((l) => l.status === 'missing' || l.status === 'insufficient')
  const unverified = lines.filter((l) => l.status === 'unverified')
  const used = lines.flatMap((l) => l.items)
  const usesPriority = used.filter((i) => {
    const level = computePriority(i, today).level
    return level === 'high' || level === 'medium'
  })
  const feasible = missing.length === 0
  const urgency = usesPriority.reduce((s, i) => s + computePriority(i, today).score, 0)
  const score =
    (feasible ? 100_000 : 0) + urgency * 10 - missing.length * 1_000 + used.length * 50 - (recipe.prepMinutes + recipe.cookMinutes)

  return { recipe, lines, missing, unverified, usesPriority, usedCount: used.length, feasible, score }
}

/**
 * Classe les recettes : faisables d'abord, puis celles qui utilisent les produits prioritaires,
 * puis celles où il manque le moins de choses, puis les plus rapides.
 * Les recettes qui n'utilisent aucun produit de l'inventaire sont écartées.
 * En mode strict, seules les recettes faisables sans courses sont gardées.
 */
export function suggestRecipes(
  recipes: Recipe[],
  inventory: InventoryItem[],
  catalog: ReadonlyMap<string, CatalogIngredient>,
  options: MatchOptions & { strict?: boolean },
): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, inventory, catalog, options))
    .filter((m) => m.usedCount > 0 && (!options.strict || m.feasible))
    .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title, 'fr'))
}

export const totalMinutes = (r: Recipe) => r.prepMinutes + r.cookMinutes
