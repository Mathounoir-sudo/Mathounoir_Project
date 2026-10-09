import { useMemo } from 'react'
import { CATALOG_BY_ID } from '../data/catalog'
import { evaluateOne, recommend, type Recommendation, type RecommendationResult } from '../domain/recipe-engine'
import type { InventoryItem, Recipe } from '../domain/types'
import { RECIPE_CATALOG } from '../services/recipes'
import { useInventory, useServings, useStaples } from './useData'

export interface EngineData {
  inventory: InventoryItem[]
  staples: Set<string>
  servings: number
}

/**
 * Recommandations calculées à partir de l'inventaire réel, des basiques confirmés et des portions choisies.
 * undefined pendant le chargement initial.
 */
export function useRecommendations(strict: boolean): (RecommendationResult & EngineData) | undefined {
  const inventory = useInventory()
  const staples = useStaples()
  const servings = useServings()
  return useMemo(() => {
    if (!inventory || !staples || servings === undefined) return undefined
    const result = recommend(RECIPE_CATALOG.recipes, inventory, { catalog: CATALOG_BY_ID, staples, servings, strict })
    return { ...result, inventory, staples, servings }
  }, [inventory, staples, servings, strict])
}

/** Évaluation d'une recette pour un nombre de portions donné. */
export function useRecipeEvaluation(recipe: Recipe | undefined, servings: number | undefined): Recommendation | undefined {
  const inventory = useInventory()
  const staples = useStaples()
  return useMemo(() => {
    if (!recipe || !inventory || !staples || servings === undefined) return undefined
    return evaluateOne(recipe, inventory, { catalog: CATALOG_BY_ID, staples, servings })
  }, [recipe, inventory, staples, servings])
}
