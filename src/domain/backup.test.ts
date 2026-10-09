import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import { makeItem } from './test-helpers'
import type { Category, Leftover } from './types'
import { CATALOG_BY_ID } from '../data/catalog'

const categoryOf = (id: string | null): Category => (id === 'tomate' ? 'vegetable' : 'other')
const parse = (json: string) => parseBackup(json, categoryOf, CATALOG_BY_ID)

const leftover: Leftover = {
  id: 'r1',
  name: 'Reste de soupe',
  ingredientId: 'soupe',
  quantity: 2,
  unit: 'portion',
  preparedOn: '2026-03-29',
  limit: { kind: 'use-by', date: '2026-04-01' },
  status: 'available',
  note: null,
  recipeId: 'soupe-legumes',
  preparationId: 'p1',
  source: 'recipe',
  createdAt: '2026-03-29T19:00:00.000Z',
  updatedAt: '2026-03-29T19:00:00.000Z',
  closedAt: null,
}

describe('sauvegarde', () => {
  const item = makeItem({ id: 'a1', name: 'Tomates', ingredientId: 'tomate', category: 'vegetable' })

  it('v3 : aller-retour sans perte (inventaire, basiques, favoris, restes, préparations)', () => {
    const backup = createBackup({
      inventory: [item],
      staples: ['sel'],
      favorites: ['omelette-vide-frigo'],
      leftovers: [leftover],
      preparations: [
        { id: 'p1', recipeId: 'soupe-legumes', recipeTitle: 'Soupe', servings: 4, eatenServings: 2, deductions: [], leftoverId: 'r1', createdAt: 'c' },
      ],
    })
    expect(parse(JSON.stringify(backup))).toEqual(backup)
  })

  it('v2 : les anciens « restes cuisinés » de l’inventaire deviennent des restes, reliés à l’ingrédient cuit', () => {
    const v2 = {
      format: 'mijote-backup',
      version: 2,
      exportedAt: '2026-03-30T10:00:00.000Z',
      inventory: [
        item,
        makeItem({ id: 'old-rice', name: 'Reste de riz', ingredientId: 'riz', status: 'leftover', quantity: 150, unit: 'g', openedOn: '2026-03-29' }),
      ],
      staples: ['sel'],
      favorites: [],
    }
    const backup = parse(JSON.stringify(v2))
    expect(backup.version).toBe(3)
    expect(backup.inventory.map((i) => i.id)).toEqual(['a1'])
    expect(backup.leftovers).toEqual([
      expect.objectContaining({ id: 'old-rice', name: 'Reste de riz', ingredientId: 'riz-cuit', quantity: 150, unit: 'g', preparedOn: '2026-03-29', status: 'available' }),
    ])
    expect(backup.staples).toEqual(['sel'])
  })

  it('v1 : convertie sans inventer de type de date', () => {
    const v1 = {
      format: 'mijote-backup',
      version: 1,
      exportedAt: '',
      pantry: [
        { id: 'x', name: 'Tomates', ingredientId: 'tomate', quantity: 3, unit: 'pièce', location: 'frigo', expiresOn: '2026-04-01', createdAt: 'c', updatedAt: 'u' },
      ],
    }
    const [migrated] = parse(JSON.stringify(v1)).inventory
    expect(migrated).toMatchObject({
      unit: 'unité',
      location: 'fridge',
      category: 'vegetable',
      status: 'unopened',
      dateLabel: { kind: 'unspecified', date: '2026-04-01' },
    })
  })

  it.each([
    ['pas du json', /pas lisible/],
    ['{"hello":1}', /pas une sauvegarde Mijoté/],
    [JSON.stringify({ format: 'mijote-backup', version: 99 }), /plus récente/],
  ])('refuse %s', (json, message) => {
    expect(() => parse(json)).toThrow(message)
  })

  it('signale l’élément invalide et rassure sur les données actuelles', () => {
    const base = { staples: [], favorites: [], preparations: [] }
    const badItem = createBackup({ ...base, inventory: [item, { ...item, unit: 'brouette' as never }], leftovers: [] })
    expect(() => parse(JSON.stringify(badItem))).toThrow(/ingrédient n°2.*intactes/)
    const badLeftover = createBackup({ ...base, inventory: [], leftovers: [{ ...leftover, status: 'mangé' as never }] })
    expect(() => parse(JSON.stringify(badLeftover))).toThrow(/reste n°1.*intactes/)
  })
})
