import { useMemo } from 'react'
import { CATALOG_BY_ID } from '../data/catalog'
import { evaluateOne, recommend, type Recommendation, type RecommendationResult } from '../domain/recipe-engine'
import type { InventoryItem, Recipe } from '../domain/types'
import { RECIPE_CATALOG } from '../services/recipes'
import { leftoverAsStock } from '../domain/leftovers'
import { useAvailableLeftovers, useInventory, useServings, useStaples } from './useData'

export interface EngineData {
  inventory: InventoryItem[]
  staples: Set<string>
  servings: number
  /** Stock vu par le moteur : inventaire + restes disponibles (ingrédients cuisinés). */
  stock: InventoryItem[]
  /** Identifiants des restes dans `stock`. */
  leftoverIds: ReadonlySet<string>
}

/** Inventaire + restes disponibles, présentés au moteur. undefined pendant le chargement. */
export function useStock(): { inventory: InventoryItem[]; stock: InventoryItem[]; leftoverIds: ReadonlySet<string> } | undefined {
  const inventory = useInventory()
  const leftovers = useAvailableLeftovers()
  return useMemo(() => {
    if (!inventory || !leftovers) return undefined
    return {
      inventory,
      stock: [...inventory, ...leftovers.map(leftoverAsStock)],
      leftoverIds: new Set(leftovers.map((l) => l.id)),
    }
  }, [inventory, leftovers])
}

/**
 * Recommandations calculées à partir de l'inventaire réel, des basiques confirmés et des portions choisies.
 * undefined pendant le chargement initial.
 */
export function useRecommendations(strict: boolean): (RecommendationResult & EngineData) | undefined {
  const stockData = useStock()
  const staples = useStaples()
  const servings = useServings()
  return useMemo(() => {
    if (!stockData || !staples || servings === undefined) return undefined
    const result = recommend(RECIPE_CATALOG.recipes, stockData.stock, { catalog: CATALOG_BY_ID, staples, servings, strict })
    return { ...result, ...stockData, staples, servings }
  }, [stockData, staples, servings, strict])
}

/** Évaluation d'une recette pour un nombre de portions donné. */
export function useRecipeEvaluation(recipe: Recipe | undefined, servings: number | undefined): Recommendation | undefined {
  const stockData = useStock()
  const staples = useStaples()
  return useMemo(() => {
    if (!recipe || !stockData || !staples || servings === undefined) return undefined
    return evaluateOne(recipe, stockData.stock, { catalog: CATALOG_BY_ID, staples, servings })
  }, [recipe, stockData, staples, servings])
}
