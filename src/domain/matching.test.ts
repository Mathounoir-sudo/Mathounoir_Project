import { describe, expect, it } from 'vitest'
import { matchRecipes } from './matching'
import type { PantryItem, Recipe } from './types'
import { INGREDIENTS_BY_ID } from '../data/ingredients'

const TODAY = '2026-03-30'

function item(ingredientId: string, expiresOn: string | null = null): PantryItem {
  return {
    id: ingredientId,
    name: ingredientId,
    ingredientId,
    quantity: null,
    unit: 'pièce',
    location: 'frigo',
    expiresOn,
    createdAt: '',
    updatedAt: '',
  }
}

const recipe = (id: string, required: string[], optional: string[] = []): Recipe => ({
  id,
  title: id,
  summary: '',
  servings: 2,
  minutes: 10,
  steps: [],
  tags: [],
  ingredients: [
    ...required.map((ingredientId) => ({ ingredientId })),
    ...optional.map((ingredientId) => ({ ingredientId, optional: true })),
    { ingredientId: 'sel' },
  ],
})

describe('matchRecipes', () => {
  const recipes = [
    recipe('omelette', ['oeuf'], ['fromage-rape']),
    recipe('pain-perdu', ['pain', 'oeuf', 'lait']),
    recipe('compote', ['pomme']),
  ]

  it('ignore les recettes sans aucun produit disponible', () => {
    const result = matchRecipes(recipes, [item('oeuf')], INGREDIENTS_BY_ID, TODAY)
    expect(result.map((m) => m.recipe.id)).toEqual(['omelette', 'pain-perdu'])
  })

  it('suppose le sel toujours présent et ignore les facultatifs manquants', () => {
    const [omelette] = matchRecipes(recipes, [item('oeuf')], INGREDIENTS_BY_ID, TODAY)
    expect(omelette?.canCook).toBe(true)
    expect(omelette?.missing).toEqual([])
  })

  it('liste ce qui manque', () => {
    const result = matchRecipes(recipes, [item('oeuf')], INGREDIENTS_BY_ID, TODAY)
    expect(result.find((m) => m.recipe.id === 'pain-perdu')?.missing).toEqual(['pain', 'lait'])
  })

  it('met en avant les recettes qui sauvent les produits urgents', () => {
    const pantry = [item('oeuf', '2026-04-20'), item('pomme', '2026-03-30')]
    const result = matchRecipes(recipes, pantry, INGREDIENTS_BY_ID, TODAY)
    expect(result[0]?.recipe.id).toBe('compote')
  })

  it('ignore les produits non reconnus', () => {
    const unknown = { ...item('x'), ingredientId: null }
    expect(matchRecipes(recipes, [unknown], INGREDIENTS_BY_ID, TODAY)).toEqual([])
  })
})
