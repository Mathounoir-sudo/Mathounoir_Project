import { describe, expect, it } from 'vitest'
import { applyUse, suggestUses, validatePortions, validateUses, type UsePlan } from './preparation'
import { evaluateOne } from './recipe-engine'
import { leftoverAsStock } from './leftovers'
import { makeItem } from './test-helpers'
import type { InventoryItem } from './types'
import { CATALOG_BY_ID } from '../data/catalog'
import { DEMO_RECIPES_RAW } from '../data/demo-recipes'

const TODAY = '2026-03-30'
const recipe = (id: string) => DEMO_RECIPES_RAW.find((r) => r.id === id)!
let n = 0
const have = (ingredientId: string, quantity: number | null, unit: InventoryItem['unit'], extra: Partial<InventoryItem> = {}) =>
  makeItem({ id: `${ingredientId}-${++n}`, name: CATALOG_BY_ID.get(ingredientId)!.name, ingredientId, quantity, unit, ...extra })
const ctx = { catalog: CATALOG_BY_ID, staples: new Set(['sel', 'huile']), servings: 2, today: TODAY }

describe('suggestUses', () => {
  it('propose les quantités de la recette, dans l’unité du produit, sans dépasser le stock', () => {
    const eggs = have('oeuf', 6, 'unité')
    const milk = have('lait', 1, 'l')
    const bread = have('pain', 3, 'tranche')
    const e = evaluateOne(recipe('pain-perdu'), [eggs, milk, bread], ctx).evaluation
    const plans = suggestUses(e, () => 'inventory', TODAY)
    expect(plans.find((p) => p.stockId === eggs.id)).toMatchObject({ mode: 'amount', quantity: 2, unit: 'unité' })
    // 20 cl demandés, stock en litres : proposition convertie en l, sans changer l'unité du produit.
    expect(plans.find((p) => p.stockId === milk.id)).toMatchObject({ mode: 'amount', quantity: 0.2, unit: 'l' })
    // 4 tranches demandées, 3 en stock : on propose 3, jamais plus.
    expect(plans.find((p) => p.stockId === bread.id)).toMatchObject({ mode: 'amount', quantity: 3 })
  })

  it('ne propose rien pour une quantité inconnue ni pour un facultatif', () => {
    const eggs = have('oeuf', null, 'unité')
    const cheese = have('fromage-rape', 100, 'g')
    const e = evaluateOne(recipe('omelette-vide-frigo'), [eggs, cheese], { ...ctx, servings: 1 }).evaluation
    const plans = suggestUses(e, () => 'inventory', TODAY)
    expect(plans.find((p) => p.stockId === eggs.id)).toMatchObject({ mode: 'none', note: 'Quantité inconnue dans l’inventaire.' })
    expect(plans.find((p) => p.stockId === cheese.id)).toMatchObject({ mode: 'none', note: expect.stringMatching(/facultatif/) })
  })

  it('répartit entre plusieurs produits, le plus urgent d’abord', () => {
    const old = have('oeuf', 1, 'unité', { dateLabel: { kind: 'best-before', date: '2026-03-31' } })
    const fresh = have('oeuf', 12, 'unité')
    const e = evaluateOne(recipe('omelette-vide-frigo'), [fresh, old], { ...ctx, servings: 1 }).evaluation
    const plans = suggestUses(e, () => 'inventory', TODAY)
    expect(plans.map((p) => [p.stockId, p.quantity])).toEqual([
      [old.id, 1],
      [fresh.id, 2],
    ])
  })

  it('utilise un reste cuisiné pour une recette qui en demande', () => {
    const rice = leftoverAsStock({
      id: 'reste-riz',
      name: 'Reste de riz',
      ingredientId: 'riz-cuit',
      quantity: 200,
      unit: 'g',
      preparedOn: '2026-03-29',
      limit: null,
      status: 'available',
      note: null,
      recipeId: null,
      preparationId: null,
      source: 'manual',
      createdAt: 'c',
      updatedAt: 'u',
      closedAt: null,
    })
    const e = evaluateOne(recipe('riz-saute'), [rice, have('oeuf', 6, 'unité'), have('sauce-soja', 20, 'cl')], { ...ctx, servings: 1 }).evaluation
    const plans = suggestUses(e, (id) => (id === 'reste-riz' ? 'leftover' : 'inventory'), TODAY)
    expect(plans.find((p) => p.stockId === 'reste-riz')).toMatchObject({ stockKind: 'leftover', mode: 'amount', quantity: 150, unit: 'g' })
  })
})

describe('validateUses / applyUse', () => {
  const plan = (overrides: Partial<UsePlan>): UsePlan => ({
    stockId: 's',
    stockKind: 'inventory',
    ingredientId: 'oeuf',
    name: 'Œufs',
    unit: 'unité',
    available: 6,
    mode: 'amount',
    quantity: 2,
    ...overrides,
  })
  const stock = (quantity: number | null) => new Map([['s', { quantity, unit: 'unité' as const, name: 'Œufs' }]])

  it('accepte une déduction possible et calcule la nouvelle quantité', () => {
    expect(validateUses([plan({})], stock(6))).toEqual({})
    expect(applyUse(6, plan({}))).toEqual({ quantity: 4, deducted: 2, finished: false })
    expect(applyUse(2, plan({}))).toEqual({ quantity: 0, deducted: 2, finished: true })
  })

  it('empêche un stock négatif', () => {
    expect(validateUses([plan({ quantity: 7 })], stock(6)).s).toMatch(/Vous en avez 6 unités : impossible d’en déduire 7 unités/)
  })

  it('refuse de déduire une quantité d’un stock inconnu, mais accepte « il n’en reste plus »', () => {
    expect(validateUses([plan({})], stock(null)).s).toMatch(/Quantité inconnue/)
    expect(validateUses([plan({ mode: 'finish', quantity: null })], stock(null))).toEqual({})
    expect(applyUse(null, plan({ mode: 'finish' }))).toEqual({ quantity: 0, deducted: null, finished: true })
  })

  it('refuse une quantité vide, nulle ou négative, et un produit disparu', () => {
    expect(validateUses([plan({ quantity: 0 })], stock(6)).s).toMatch(/quantité positive/)
    expect(validateUses([plan({ quantity: null })], stock(6)).s).toMatch(/quantité positive/)
    expect(validateUses([plan({})], new Map()).s).toMatch(/n’est plus dans votre inventaire/)
  })

  it('« ne rien déduire » ne change rien', () => {
    expect(validateUses([plan({ mode: 'none', quantity: 999 })], stock(1))).toEqual({})
    expect(applyUse(1, plan({ mode: 'none' }))).toEqual({ quantity: 1, deducted: null, finished: false })
  })
})

describe('validatePortions', () => {
  it.each([
    [2, 1, null],
    [2, 0, null],
    [2, 2, null],
    [2, 3, /plus de 2 portions/],
    [0, 0, /au moins une portion/],
    [2, 1.5, /nombre entier/],
  ])('%s préparées, %s mangées', (servings, eaten, expected) => {
    const r = validatePortions(servings, eaten)
    if (expected === null) expect(r).toBeNull()
    else expect(r).toMatch(expected)
  })
})
