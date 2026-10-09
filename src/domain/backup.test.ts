import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import { makeItem } from './test-helpers'
import type { Category } from './types'

const categoryOf = (id: string | null): Category => (id === 'tomate' ? 'vegetable' : 'other')

describe('sauvegarde', () => {
  const item = makeItem({ id: 'a1', name: 'Tomates', ingredientId: 'tomate', category: 'vegetable' })

  it('fait un aller-retour sans perte', () => {
    const backup = createBackup({ inventory: [item], staples: ['sel'], favorites: ['omelette'] })
    expect(parseBackup(JSON.stringify(backup), categoryOf)).toEqual(backup)
  })

  it('convertit une sauvegarde de la version précédente sans inventer de type de date', () => {
    const v1 = {
      format: 'mijote-backup',
      version: 1,
      exportedAt: '',
      pantry: [
        {
          id: 'x',
          name: 'Tomates',
          ingredientId: 'tomate',
          quantity: 3,
          unit: 'pièce',
          location: 'frigo',
          expiresOn: '2026-04-01',
          createdAt: 'c',
          updatedAt: 'u',
        },
      ],
    }
    const [migrated] = parseBackup(JSON.stringify(v1), categoryOf).inventory
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
    expect(() => parseBackup(json, categoryOf)).toThrow(message)
  })

  it('signale l’ingrédient invalide et rassure sur les données actuelles', () => {
    const bad = createBackup({ inventory: [item, { ...item, unit: 'brouette' as never }], staples: [], favorites: [] })
    expect(() => parseBackup(JSON.stringify(bad), categoryOf)).toThrow(/ingrédient n°2.*intactes/)
  })
})
