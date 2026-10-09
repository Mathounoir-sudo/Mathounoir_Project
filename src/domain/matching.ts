import type { Ingredient, PantryItem, Recipe } from './types'
import { expiryStatus, todayISO, type ExpiryStatus } from './dates'

export interface RecipeMatch {
  recipe: Recipe
  /** Ingrédients obligatoires absents du garde-manger. */
  missing: string[]
  /** Produits du garde-manger que la recette permet d'utiliser. */
  used: PantryItem[]
  /** Plus le score est haut, plus la recette aide à éviter le gaspillage. */
  urgency: number
  canCook: boolean
}

const URGENCY_WEIGHT: Record<ExpiryStatus, number> = {
  expired: 5,
  today: 5,
  soon: 3,
  ok: 1,
  unknown: 1,
}

/**
 * Classe les recettes selon ce qu'il y a dans le garde-manger :
 * d'abord celles qu'on peut cuisiner tout de suite, puis celles qui utilisent
 * les produits les plus urgents, puis celles où il manque le moins de choses.
 * Les ingrédients de base (sel, huile, eau…) sont supposés toujours disponibles.
 */
export function matchRecipes(
  recipes: Recipe[],
  pantry: PantryItem[],
  catalog: ReadonlyMap<string, Ingredient>,
  today: string = todayISO(),
): RecipeMatch[] {
  const byIngredient = new Map<string, PantryItem[]>()
  for (const item of pantry) {
    if (!item.ingredientId) continue
    const list = byIngredient.get(item.ingredientId) ?? []
    list.push(item)
    byIngredient.set(item.ingredientId, list)
  }
  const isBase = (id: string) => catalog.get(id)?.category === 'base'

  const matches: RecipeMatch[] = []
  for (const recipe of recipes) {
    const missing: string[] = []
    const used: PantryItem[] = []
    let urgency = 0
    for (const ri of recipe.ingredients) {
      if (isBase(ri.ingredientId)) continue
      const items = byIngredient.get(ri.ingredientId)
      if (items && items.length > 0) {
        used.push(...items)
        urgency += Math.max(...items.map((i) => URGENCY_WEIGHT[expiryStatus(i.expiresOn, today)]))
      } else if (!ri.optional) {
        missing.push(ri.ingredientId)
      }
    }
    if (used.length === 0) continue
    matches.push({ recipe, missing, used, urgency, canCook: missing.length === 0 })
  }

  return matches.sort(
    (a, b) =>
      Number(b.canCook) - Number(a.canCook) ||
      b.urgency - a.urgency ||
      a.missing.length - b.missing.length ||
      a.recipe.title.localeCompare(b.recipe.title, 'fr'),
  )
}
