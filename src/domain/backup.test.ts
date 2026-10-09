import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import type { PantryItem } from './types'

const sample: PantryItem = {
  id: 'a1',
  name: 'Tomates',
  ingredientId: 'tomate',
  quantity: 3,
  unit: 'pièce',
  location: 'frigo',
  expiresOn: '2026-04-01',
  createdAt: '2026-03-30T10:00:00.000Z',
  updatedAt: '2026-03-30T10:00:00.000Z',
}

describe('sauvegarde', () => {
  it('fait un aller-retour sans perte', () => {
    const json = JSON.stringify(createBackup([sample]))
    expect(parseBackup(json).pantry).toEqual([sample])
  })
  it('refuse un fichier qui n’est pas du JSON', () => {
    expect(() => parseBackup('pas du json')).toThrow(/pas une sauvegarde/)
  })
  it('refuse un autre format', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow(/pas une sauvegarde Mijoté/)
  })
  it('refuse une version future', () => {
    const json = JSON.stringify({ ...createBackup([]), version: 99 })
    expect(() => parseBackup(json)).toThrow(/plus récente/)
  })
  it('signale un produit invalide', () => {
    const json = JSON.stringify(createBackup([{ ...sample, unit: 'brouette' } as unknown as PantryItem]))
    expect(() => parseBackup(json)).toThrow(/n°1/)
  })
})
