import type { Recipe } from '../domain/types'
import { recipeSchema } from '../domain/schemas'
import { DEMO_RECIPES_RAW } from '../data/demo-recipes'
import { db as defaultDb, type MijoteDB } from '../lib/db'
import { withStorage } from '../lib/errors'

export interface RecipeCatalog {
  recipes: Recipe[]
  /** Recettes écartées car invalides (jamais affichées). */
  rejected: { index: number; message: string }[]
}

/**
 * Valide une liste de recettes avant affichage. Les recettes invalides sont écartées
 * et signalées : l'application ne plante pas et n'affiche jamais de données incohérentes.
 * (La future génération par IA passera par la même validation.)
 */
export function validateRecipes(raw: unknown[]): RecipeCatalog {
  const recipes: Recipe[] = []
  const rejected: RecipeCatalog['rejected'] = []
  raw.forEach((r, index) => {
    const parsed = recipeSchema.safeParse(r)
    if (parsed.success) recipes.push(parsed.data)
    else rejected.push({ index, message: parsed.error.issues[0]?.message ?? 'Recette invalide' })
  })
  if (rejected.length > 0) console.warn('Recettes invalides écartées :', rejected)
  return { recipes, rejected }
}

export const RECIPE_CATALOG: RecipeCatalog = validateRecipes(DEMO_RECIPES_RAW)

export function findRecipe(id: string | undefined): Recipe | undefined {
  return RECIPE_CATALOG.recipes.find((r) => r.id === id)
}

export async function toggleFavorite(recipeId: string, database: MijoteDB = defaultDb): Promise<boolean> {
  return withStorage('enregistrer la recette', async () => {
    const existing = await database.favorites.get(recipeId)
    if (existing) {
      await database.favorites.delete(recipeId)
      return false
    }
    await database.favorites.put({ recipeId, savedAt: new Date().toISOString() })
    return true
  })
}

export async function getFavorites(database: MijoteDB = defaultDb): Promise<string[]> {
  return withStorage('lire vos recettes enregistrées', async () =>
    (await database.favorites.orderBy('savedAt').reverse().toArray()).map((f) => f.recipeId),
  )
}
