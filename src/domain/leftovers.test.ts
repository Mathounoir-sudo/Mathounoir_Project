import { describe, expect, it } from 'vitest'
import { computeLeftoverPriority, cookedLinkFor, leftoverAsStock, readStoredLeftovers, sortLeftovers } from './leftovers'
import type { Leftover } from './types'
import { CATALOG_BY_ID } from '../data/catalog'

const TODAY = '2026-03-30'
const make = (overrides: Partial<Leftover> = {}): Leftover => ({
  id: 'l1',
  name: 'Reste de riz',
  ingredientId: 'riz-cuit',
  quantity: 150,
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
  ...overrides,
})

describe('ingrédient cuisiné d’un reste', () => {
  it.each([
    ['Reste de riz', null, 'riz-cuit'],
    ['Légumes rôtis', null, 'legumes-cuits'],
    ['Velouté de courgettes', null, 'soupe'],
    // Ancien reste relié au riz CRU : converti en riz cuit, jamais laissé comme riz cru.
    ['Riz de midi', 'riz', 'riz-cuit'],
    ['Curry de lentilles', null, null],
    ['Tomates', 'tomate', null],
  ])('« %s » (%s) → %s', (name, known, expected) => {
    expect(cookedLinkFor(name, known, CATALOG_BY_ID)).toBe(expected)
  })
})

describe('priorité d’un reste', () => {
  it('distingue la date de préparation d’une date limite, et ne calcule aucune durée de conservation', () => {
    const p = computeLeftoverPriority(make(), TODAY)
    expect(p.level).toBe('medium')
    expect(p.reasons).toEqual(['Préparé hier (29 mars). Aucune date limite fixée : Mijoté ne calcule pas de durée de conservation.'])
  })

  it('limite de sécurité dépassée : alerte factuelle, exclu des recettes', () => {
    const p = computeLeftoverPriority(make({ limit: { kind: 'use-by', date: '2026-03-29' } }), TODAY)
    expect(p.safety).toBe('do-not-eat')
    expect(p.reasons[0]).toMatch(/La date limite de sécurité que vous avez fixée \(29 mars\) est dépassée/)
  })

  it('date indicative dépassée : pas équivalente à une limite de sécurité', () => {
    const p = computeLeftoverPriority(make({ limit: { kind: 'best-before', date: '2026-03-29' } }), TODAY)
    expect(p.safety).toBe('ok')
    expect(p.level).toBe('high')
    expect(p.reasons[0]).toMatch(/ce n’est pas une limite de sécurité/)
  })

  it('trie les dates limites les plus proches d’abord, puis les restes sans date (même règle que l’inventaire)', () => {
    const a = make({ id: 'a', limit: { kind: 'use-by', date: '2026-04-10' } })
    const b = make({ id: 'b', limit: { kind: 'use-by', date: '2026-03-31' } })
    const c = make({ id: 'c' })
    expect(sortLeftovers([a, c, b], TODAY).map((x) => x.leftover.id)).toEqual(['b', 'a', 'c'])
    expect(sortLeftovers([c, b, a], TODAY).map((x) => x.leftover.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('lecture et adaptation', () => {
  it('présente un reste au moteur comme un produit cuisiné', () => {
    expect(leftoverAsStock(make({ limit: { kind: 'use-by', date: '2026-04-01' } }))).toMatchObject({
      ingredientId: 'riz-cuit',
      linkConfirmed: true,
      status: 'leftover',
      openedOn: '2026-03-29',
      dateLabel: { kind: 'use-by', date: '2026-04-01' },
    })
  })

  it('signale un reste illisible sans planter ni le supprimer', () => {
    const r = readStoredLeftovers([make(), { ...make({ id: 'x' }), status: 'mangé' }, null])
    expect(r.leftovers.map((l) => l.id)).toEqual(['l1'])
    expect(r.unreadable.map((u) => u.id)).toEqual(['x', '(sans identifiant)'])
  })
})
