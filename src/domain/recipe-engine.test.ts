import { describe, expect, it } from 'vitest'
import { compareEvaluations, evaluateOne, pickVaried, recommend, type EngineContext } from './recipe-engine'
import type { InventoryItem, Recipe, RecipeIngredient } from './types'
import { makeItem } from './test-helpers'
import { CATALOG_BY_ID } from '../data/catalog'
import { DEMO_RECIPES_RAW } from '../data/demo-recipes'

const TODAY = '2026-03-30'
const ctx = (overrides: Partial<EngineContext & { strict: boolean }> = {}): EngineContext & { strict?: boolean } => ({
  catalog: CATALOG_BY_ID,
  staples: new Set<string>(),
  servings: 1,
  today: TODAY,
  ...overrides,
})

let n = 0
/** Produit de l'inventaire relié de façon confirmée à un ingrédient du catalogue. */
const have = (ingredientId: string, quantity: number | null, unit: InventoryItem['unit'], extra: Partial<InventoryItem> = {}) =>
  makeItem({ id: `${ingredientId}-${++n}`, name: CATALOG_BY_ID.get(ingredientId)!.name, ingredientId, quantity, unit, ...extra })

const recipe = (id: string, ingredients: RecipeIngredient[], extra: Partial<Recipe> = {}): Recipe => ({
  id,
  title: id,
  description: '…',
  family: id,
  servings: 1,
  scalable: true,
  prepMinutes: 5,
  cookMinutes: 5,
  ingredients,
  equipment: [],
  steps: [{ text: '…' }],
  substitutions: [],
  tips: [],
  antiWaste: '…',
  storage: null,
  safety: [],
  tags: [],
  ...extra,
})

const omelette = recipe('omelette', [
  { ingredientId: 'oeuf', quantity: 3, unit: 'unité' },
  { ingredientId: 'sel', quantity: null, unit: null },
  { ingredientId: 'fromage-rape', quantity: 20, unit: 'g', optional: true },
])
const line = (r: ReturnType<typeof evaluateOne>, id: string) => r.evaluation.lines.find((l) => l.ingredientId === id)!

describe('correspondance des ingrédients', () => {
  it('relie un produit au nom exact', () => {
    const item = makeItem({ id: 'a', name: 'Œufs', ingredientId: null, linkConfirmed: false, quantity: 6 })
    expect(line(evaluateOne(omelette, [item], ctx()), 'oeuf').status).toBe('available')
  })

  it('relie un synonyme explicite du catalogue', () => {
    const item = makeItem({ id: 'a', name: 'Emmental', ingredientId: null, linkConfirmed: false, quantity: 50, unit: 'g' })
    expect(line(evaluateOne(omelette, [item], ctx()), 'fromage-rape').status).toBe('available')
  })

  it('ne relie jamais deux ingrédients non équivalents', () => {
    // « Bouillon de poulet » contient « poulet » mais n'est pas du poulet.
    const r = recipe('poulet-roti', [{ ingredientId: 'poulet', quantity: 200, unit: 'g' }])
    const item = makeItem({ id: 'b', name: 'Bouillon de poulet', ingredientId: null, linkConfirmed: false, quantity: 1, unit: 'unité' })
    expect(line(evaluateOne(r, [item], ctx()), 'poulet').status).toBe('missing')
  })

  it('marque « à confirmer » un lien seulement probable, sans le compter comme disponible', () => {
    const item = makeItem({ id: 'c', name: 'Œufs bio de la ferme', ingredientId: null, linkConfirmed: false, quantity: 6 })
    const r = evaluateOne(omelette, [item], ctx({ staples: new Set(['sel']) }))
    expect(line(r, 'oeuf')).toMatchObject({ status: 'uncertain', uncertainty: ['probable-match'] })
    expect(r.evaluation.feasibility).toBe('to-confirm')
    expect(r.evaluation.usedItems).toEqual([])
  })

  it('respecte un lien confirmé par l’utilisateur', () => {
    const item = makeItem({ id: 'd', name: 'Œufs bio de la ferme', ingredientId: 'oeuf', linkConfirmed: true, quantity: 6 })
    expect(line(evaluateOne(omelette, [item], ctx()), 'oeuf').status).toBe('available')
  })
})

describe('quantités', () => {
  it('suffisant, insuffisant avec la quantité qui manque, manquant', () => {
    expect(line(evaluateOne(omelette, [have('oeuf', 3, 'unité')], ctx()), 'oeuf').status).toBe('available')
    expect(line(evaluateOne(omelette, [have('oeuf', 2, 'unité')], ctx()), 'oeuf')).toMatchObject({
      status: 'insufficient',
      have: 2,
      shortfall: 1,
    })
    expect(line(evaluateOne(omelette, [], ctx()), 'oeuf').status).toBe('missing')
  })

  it('une quantité inconnue n’est jamais considérée comme suffisante', () => {
    const l = line(evaluateOne(omelette, [have('oeuf', null, 'unité')], ctx()), 'oeuf')
    expect(l).toMatchObject({ status: 'uncertain', uncertainty: ['quantity-unknown'] })
  })

  it('convertit les unités compatibles (kg → g, l → cl, c. à s. → ml)', () => {
    const r = recipe('r', [
      { ingredientId: 'farine', quantity: 200, unit: 'g' },
      { ingredientId: 'lait', quantity: 20, unit: 'cl' },
      { ingredientId: 'sauce-soja', quantity: 2, unit: 'c. à s.' },
    ])
    const e = evaluateOne(r, [have('farine', 1, 'kg'), have('lait', 0.5, 'l'), have('sauce-soja', 25, 'cl')], ctx())
    expect(e.evaluation.lines.map((l) => l.status)).toEqual(['available', 'available', 'available'])
    expect(line(e, 'farine').have).toBe(1000)
  })

  it('ne convertit jamais entre masse et volume, ni entre unités de comptage', () => {
    const r = recipe('r', [
      { ingredientId: 'farine', quantity: 200, unit: 'g' },
      { ingredientId: 'pain', quantity: 2, unit: 'tranche' },
    ])
    const e = evaluateOne(r, [have('farine', 50, 'cl'), have('pain', 1, 'unité')], ctx())
    expect(line(e, 'farine')).toMatchObject({ status: 'uncertain', uncertainty: ['unit-incompatible'] })
    expect(line(e, 'pain')).toMatchObject({ status: 'uncertain', uncertainty: ['unit-incompatible'] })
  })

  it('additionne les entrées en double, chacune une seule fois', () => {
    const a = have('oeuf', 2, 'unité')
    const b = have('oeuf', 2, 'unité')
    expect(line(evaluateOne(omelette, [a, b], ctx()), 'oeuf')).toMatchObject({ status: 'available', have: 4 })
    // La même entrée présente deux fois n'est comptée qu'une fois.
    expect(line(evaluateOne(omelette, [a, a], ctx()), 'oeuf')).toMatchObject({ status: 'insufficient', have: 2 })
  })

  it('additionne des entrées dans des unités compatibles différentes', () => {
    const r = recipe('r', [{ ingredientId: 'lait', quantity: 60, unit: 'cl' }])
    expect(line(evaluateOne(r, [have('lait', 0.5, 'l'), have('lait', 100, 'ml')], ctx()), 'lait')).toMatchObject({
      status: 'available',
      have: 60,
    })
  })
})

describe('basiques', () => {
  it('ne suppose jamais le sel, l’huile ou l’eau présents', () => {
    const e = evaluateOne(omelette, [have('oeuf', 6, 'unité')], ctx())
    expect(line(e, 'sel').status).toBe('missing')
    expect(e.evaluation.feasibility).toBe('shopping')
  })
  it('compte un basique confirmé par l’utilisateur', () => {
    const e = evaluateOne(omelette, [have('oeuf', 6, 'unité')], ctx({ staples: new Set(['sel']) }))
    expect(line(e, 'sel')).toMatchObject({ status: 'available', source: 'staple' })
    expect(e.evaluation.feasibility).toBe('ready')
  })
})

describe('sécurité alimentaire', () => {
  it('n’utilise jamais un produit à DLC dépassée et l’explique', () => {
    const expired = have('oeuf', 6, 'unité', { dateLabel: { kind: 'use-by', date: '2026-03-29' } })
    const e = evaluateOne(omelette, [expired], ctx({ staples: new Set(['sel']) }))
    expect(line(e, 'oeuf')).toMatchObject({ status: 'missing', unusable: [{ item: expired, reason: 'use-by-expired' }] })
    expect(e.reasons.join(' ')).toMatch(/n’est pas utilisé : DLC dépassée/)
  })

  it('utilise un produit à DDM dépassée (ce n’est pas une DLC) et le rend prioritaire', () => {
    const ddm = have('oeuf', 6, 'unité', { dateLabel: { kind: 'best-before', date: '2026-03-29' } })
    const e = evaluateOne(omelette, [ddm], ctx({ staples: new Set(['sel']) }))
    expect(e.evaluation.feasibility).toBe('ready')
    expect(e.evaluation.priorityItems.map((p) => p.item.id)).toEqual([ddm.id])
  })

  it('n’utilise pas un produit dont la date de type inconnu est dépassée', () => {
    const unknown = have('oeuf', 6, 'unité', { dateLabel: { kind: 'unspecified', date: '2026-03-01' } })
    expect(line(evaluateOne(omelette, [unknown], ctx()), 'oeuf').unusable[0]?.reason).toBe('date-to-check')
  })
})

describe('portions', () => {
  const painPerdu = DEMO_RECIPES_RAW.find((r) => r.id === 'pain-perdu')!

  it('recalcule les quantités à partir des portions de base, sans changer les unités', () => {
    const e = evaluateOne(painPerdu, [], ctx({ servings: 1 })).evaluation
    expect(e.servings).toBe(1)
    expect(e.lines.map((l) => [l.ingredientId, l.quantity, l.unit])).toEqual([
      ['pain', 2, 'tranche'],
      ['oeuf', 1, 'unité'],
      ['lait', 10, 'cl'],
      ['sucre', 0.5, 'c. à s.'],
      ['beurre', 10, 'g'],
      ['epices', 1, 'pincée'],
    ])
  })

  it('recalcule la faisabilité et la quantité manquante', () => {
    const inventory = [have('pain', 4, 'tranche'), have('oeuf', 2, 'unité'), have('lait', 20, 'cl'), have('sucre', 100, 'g'), have('beurre', 50, 'g')]
    // Sucre en grammes, recette en cuillères : non comparable, donc à confirmer, quel que soit le nombre de portions.
    const two = evaluateOne(painPerdu, inventory, ctx({ servings: 2 })).evaluation
    expect(two.toBuy).toEqual([])
    const four = evaluateOne(painPerdu, inventory, ctx({ servings: 4 })).evaluation
    expect(four.toBuy.map((l) => [l.ingredientId, l.shortfall])).toEqual([
      ['pain', 4],
      ['oeuf', 2],
      ['lait', 20],
    ])
  })

  it('arrondit pour la cuisine (demi-œuf, cuillères)', () => {
    const r = recipe('r', [{ ingredientId: 'oeuf', quantity: 3, unit: 'unité' }], { servings: 2 })
    expect(evaluateOne(r, [], ctx({ servings: 1 })).evaluation.lines[0]!.quantity).toBe(1.5)
  })

  it('n’ajuste pas une recette non ajustable et le signale', () => {
    const bread = DEMO_RECIPES_RAW.find((r) => r.id === 'banana-bread')!
    const r = evaluateOne(bread, [], ctx({ servings: 2 }))
    expect(r.evaluation).toMatchObject({ servings: 6, servingsLocked: true })
    expect(r.evaluation.lines[0]!.quantity).toBe(3)
    expect(r.reasons.join(' ')).toMatch(/ne s’ajuste pas/)
  })

  it('ne modifie jamais l’inventaire', () => {
    const inventory = [have('oeuf', 6, 'unité')]
    const copy = structuredClone(inventory)
    evaluateOne(omelette, inventory, ctx({ servings: 4 }))
    expect(inventory).toEqual(copy)
  })
})

describe('remplacements', () => {
  const gratin = DEMO_RECIPES_RAW.find((r) => r.id === 'gratin-pates')!
  const base = [have('pates', 500, 'g'), have('fromage-rape', 100, 'g')]

  it('un ingrédient obligatoire remplaçable n’est pas exigé si le remplacement est disponible', () => {
    const e = evaluateOne(gratin, [...base, have('lait', 50, 'cl'), have('oeuf', 2, 'unité')], ctx({ servings: 2, staples: new Set(['sel']) }))
    expect(line(e, 'creme').status).toBe('substituted')
    expect(e.evaluation.feasibility).toBe('ready')
    expect(e.reasons.join(' ')).toMatch(/crème → lait \+ œuf/)
  })

  it('reste à acheter si le remplacement est incomplet', () => {
    const e = evaluateOne(gratin, [...base, have('lait', 50, 'cl')], ctx({ servings: 2, staples: new Set(['sel']) }))
    expect(line(e, 'creme').status).toBe('missing')
    expect(e.evaluation.feasibility).toBe('shopping')
  })
})

describe('recommandations', () => {
  const recipes = DEMO_RECIPES_RAW
  const staples = new Set(['sel', 'poivre', 'huile', 'eau'])

  it('inventaire vide : aucune recommandation', () => {
    expect(recommend(recipes, [], ctx({ staples })).recommendations).toEqual([])
  })

  it('au plus trois recommandations, variées', () => {
    const inventory = [have('oeuf', 12, 'unité'), have('pain', 8, 'tranche'), have('lait', 1, 'l'), have('beurre', 250, 'g'), have('sucre', 1, 'kg'), have('pates', 1, 'kg'), have('tomate', 6, 'unité'), have('fromage-rape', 200, 'g'), have('creme', 30, 'cl'), have('jambon', 4, 'tranche')]
    const { recommendations } = recommend(recipes, inventory, ctx({ staples, servings: 2 }))
    expect(recommendations).toHaveLength(3)
    const families = recommendations.map((r) => r.evaluation.recipe.family)
    expect(new Set(families).size).toBe(3)
  })

  it('moins de trois recettes faisables en mode strict : ne renvoie que celles-ci', () => {
    const r = recommend(recipes, [have('oeuf', 3, 'unité')], ctx({ staples, strict: true }))
    expect(r.recommendations.map((x) => x.evaluation.recipe.id)).toEqual(['omelette-vide-frigo'])
    expect(r.excluded.length).toBeGreaterThan(0)
    expect(r.excluded.every((x) => x.evaluation.feasibility === 'shopping')).toBe(true)
  })

  it('mode strict sans aucune recette faisable : liste vide, exclusions expliquées', () => {
    const r = recommend(recipes, [have('banane', 1, 'unité')], ctx({ staples, strict: true }))
    expect(r.recommendations).toEqual([])
    expect(r.excluded.map((x) => x.evaluation.recipe.id)).toEqual(['banana-bread'])
    expect(r.excluded[0]!.reasons[0]).toMatch(/^À acheter : banane \(il manque 2 unités\), œuf, farine/)
  })

  it('mode strict : n’accepte jamais une recette avec un ingrédient insuffisant', () => {
    const r = recommend(recipes, [have('oeuf', 2, 'unité')], ctx({ staples, strict: true }))
    expect(r.recommendations.map((x) => x.evaluation.recipe.id)).not.toContain('omelette-vide-frigo')
  })

  it('une recette faisable n’est jamais classée derrière une recette qui demande des courses', () => {
    const inventory = [have('oeuf', 3, 'unité'), have('banane', 3, 'unité', { urgent: true }), have('pomme', 1, 'unité', { urgent: true })]
    const { ranked } = recommend(recipes, inventory, ctx({ staples }))
    const tiers = ranked.map((r) => r.evaluation.feasibility)
    expect(tiers[0]).toBe('ready')
    expect(tiers.indexOf('shopping')).toBeGreaterThan(tiers.lastIndexOf('ready'))
  })

  it('à faisabilité égale, privilégie les produits prioritaires et l’explique', () => {
    const inventory = [have('oeuf', 6, 'unité'), have('pomme', 4, 'unité', { dateLabel: { kind: 'use-by', date: '2026-03-31' } })]
    const { recommendations } = recommend(recipes, inventory, ctx({ staples }))
    expect(recommendations[0]!.evaluation.recipe.id).toBe('compote-express')
    expect(recommendations[0]!.reasons).toContain('Utilise un produit à écouler : Pomme (DLC demain).')
  })

  it('signale l’incertitude quand aucune priorité n’est renseignée', () => {
    const { recommendations } = recommend(recipes, [have('oeuf', 3, 'unité')], ctx({ staples }))
    expect(recommendations[0]!.reasons.join(' ')).toMatch(/l’urgence reste incertaine/)
  })

  it('classement stable pour des entrées identiques', () => {
    const inventory = [have('oeuf', 6, 'unité'), have('pain', 4, 'tranche'), have('lait', 50, 'cl')]
    const a = recommend(recipes, inventory, ctx({ staples })).ranked.map((r) => r.evaluation.recipe.id)
    const b = recommend([...recipes].reverse(), [...inventory].reverse(), ctx({ staples })).ranked.map((r) => r.evaluation.recipe.id)
    expect(b).toEqual(a)
  })
})

describe('pickVaried', () => {
  it('ne fait jamais passer la variété avant la faisabilité', () => {
    const inventory = [have('pates', 1, 'kg'), have('tomate', 8, 'unité'), have('creme', 30, 'cl'), have('fromage-rape', 200, 'g')]
    const all = recommend(DEMO_RECIPES_RAW, inventory, ctx({ staples: new Set(['sel', 'huile']), servings: 2 })).all
    const ready = all.filter((e) => e.feasibility === 'ready')
    // Les deux recettes de pâtes sont faisables : elles passent avant toute recette demandant des courses.
    expect(ready.map((e) => e.recipe.family)).toEqual(['pâtes', 'pâtes'])
    const picked = pickVaried(all, 3)
    expect(picked.slice(0, 2).every((e) => e.feasibility === 'ready')).toBe(true)
    expect(compareEvaluations(picked[0]!, picked[1]!)).toBeLessThan(0)
  })
})
