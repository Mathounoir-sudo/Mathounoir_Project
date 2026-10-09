import { describe, expect, it } from 'vitest'
import { matchRecipe, suggestRecipes } from './matching'
import type { Recipe, RecipeIngredient } from './types'
import { makeItem } from './test-helpers'
import { CATALOG_BY_ID } from '../data/catalog'

const TODAY = '2026-03-30'
const noStaples = { staples: new Set<string>(), today: TODAY }

const recipe = (id: string, ingredients: RecipeIngredient[], minutes = 10): Recipe => ({
  id,
  title: id,
  description: '',
  servings: 1,
  prepMinutes: minutes,
  cookMinutes: 0,
  ingredients,
  steps: ['…'],
  substitutions: [],
  storage: null,
  safety: [],
  tags: [],
})

const omelette = recipe('omelette', [
  { ingredientId: 'oeuf', quantity: 3, unit: 'unité' },
  { ingredientId: 'fromage-rape', quantity: 30, unit: 'g', optional: true },
  { ingredientId: 'sel', quantity: null, unit: null },
])
const painPerdu = recipe('pain-perdu', [
  { ingredientId: 'pain', quantity: 2, unit: 'tranche' },
  { ingredientId: 'oeuf', quantity: 1, unit: 'unité' },
  { ingredientId: 'lait', quantity: 10, unit: 'cl' },
])
const compote = recipe('compote', [{ ingredientId: 'pomme', quantity: 4, unit: 'unité' }])

const eggs = (quantity: number | null = 6) => makeItem({ id: 'e', name: 'Œufs', ingredientId: 'oeuf', quantity, unit: 'unité' })

describe('matchRecipe', () => {
  it('ne suppose jamais un basique présent s’il n’est pas confirmé', () => {
    const m = matchRecipe(omelette, [eggs()], CATALOG_BY_ID, noStaples)
    expect(m.feasible).toBe(false)
    expect(m.missing.map((l) => l.ingredient.ingredientId)).toEqual(['sel'])
  })

  it('compte un basique confirmé comme disponible', () => {
    const m = matchRecipe(omelette, [eggs()], CATALOG_BY_ID, { staples: new Set(['sel']), today: TODAY })
    expect(m.feasible).toBe(true)
  })

  it('ignore les ingrédients facultatifs manquants', () => {
    const m = matchRecipe(omelette, [eggs()], CATALOG_BY_ID, { staples: new Set(['sel']), today: TODAY })
    expect(m.lines.find((l) => l.ingredient.ingredientId === 'fromage-rape')?.status).toBe('missing')
    expect(m.missing).toEqual([])
  })

  it('signale une quantité insuffisante dans la même unité', () => {
    const m = matchRecipe(omelette, [eggs(2)], CATALOG_BY_ID, { staples: new Set(['sel']), today: TODAY })
    expect(m.feasible).toBe(false)
    expect(m.missing[0]).toMatchObject({ status: 'insufficient', have: 2 })
  })

  it('additionne plusieurs produits identiques', () => {
    const m = matchRecipe(omelette, [eggs(2), { ...eggs(2), id: 'e2' }], CATALOG_BY_ID, {
      staples: new Set(['sel']),
      today: TODAY,
    })
    expect(m.feasible).toBe(true)
  })

  it('ne conclut pas quand les unités diffèrent ou la quantité est inconnue', () => {
    const m = matchRecipe(omelette, [eggs(null)], CATALOG_BY_ID, { staples: new Set(['sel']), today: TODAY })
    expect(m.feasible).toBe(true)
    expect(m.unverified.map((l) => l.ingredient.ingredientId)).toEqual(['oeuf'])
  })

  it('n’utilise jamais un produit à DLC dépassée ni un produit épuisé', () => {
    const expired = { ...eggs(), dateLabel: { kind: 'use-by' as const, date: '2026-03-01' } }
    expect(matchRecipe(omelette, [expired], CATALOG_BY_ID, noStaples).usedCount).toBe(0)
    expect(matchRecipe(omelette, [eggs(0)], CATALOG_BY_ID, noStaples).usedCount).toBe(0)
  })
})

describe('suggestRecipes', () => {
  const all = [omelette, painPerdu, compote]

  it('renvoie une liste vide pour un inventaire vide', () => {
    expect(suggestRecipes(all, [], CATALOG_BY_ID, noStaples)).toEqual([])
  })

  it('écarte les recettes qui n’utilisent rien de l’inventaire', () => {
    const ids = suggestRecipes(all, [eggs()], CATALOG_BY_ID, noStaples).map((m) => m.recipe.id)
    expect(ids).not.toContain('compote')
  })

  it('mode strict : uniquement les recettes réalisables sans courses', () => {
    const opts = { staples: new Set(['sel']), today: TODAY, strict: true }
    expect(suggestRecipes(all, [eggs()], CATALOG_BY_ID, opts).map((m) => m.recipe.id)).toEqual(['omelette'])
  })

  it('met en avant les recettes qui utilisent les produits prioritaires', () => {
    const apples = makeItem({ id: 'p', ingredientId: 'pomme', quantity: 4, urgent: true })
    const result = suggestRecipes(all, [eggs(), apples], CATALOG_BY_ID, { staples: new Set(['sel']), today: TODAY })
    expect(result[0]?.recipe.id).toBe('compote')
    expect(result[0]?.usesPriority.map((i) => i.id)).toEqual(['p'])
  })
})
