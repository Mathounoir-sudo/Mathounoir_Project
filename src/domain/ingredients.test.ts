import { describe, expect, it } from 'vitest'
import { buildMatchers, matchIngredient } from './ingredients'
import { INGREDIENTS } from '../data/ingredients'
import { RECIPES } from '../data/recipes'

const matchers = buildMatchers(INGREDIENTS)

describe('matchIngredient', () => {
  it.each([
    ['Tomates cerises', 'tomate'],
    ['Pommes de terre', 'pomme-de-terre'],
    ['Pommes', 'pomme'],
    ['6 œufs bio', 'oeuf'],
    ['Reste de riz', 'riz'],
    ['Lait de coco', 'lait-coco'],
    ['Lait demi-écrémé', 'lait'],
    ['Pâte feuilletée', 'pate-a-tarte'],
    ['Spaghetti', 'pates'],
    ['Emmental râpé', 'fromage-rape'],
    ['Chou-fleur', 'chou-fleur'],
    ['Persil', 'herbes'],
  ])('« %s » → %s', (label, expected) => {
    expect(matchIngredient(label, matchers)).toBe(expected)
  })

  it('renvoie null pour un produit inconnu', () => {
    expect(matchIngredient('Tofu fumé', matchers)).toBeNull()
    expect(matchIngredient('   ', matchers)).toBeNull()
  })
})

describe('données', () => {
  it('chaque ingrédient de recette existe dans le catalogue', () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id))
    for (const r of RECIPES) {
      for (const ri of r.ingredients) expect(ids, `${r.id} → ${ri.ingredientId}`).toContain(ri.ingredientId)
    }
  })
  it('les identifiants sont uniques', () => {
    expect(new Set(INGREDIENTS.map((i) => i.id)).size).toBe(INGREDIENTS.length)
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
  })
})
