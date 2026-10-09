import { describe, expect, it } from 'vitest'
import { readStoredItems } from './stored'
import { makeItem } from './test-helpers'
import type { Category } from './types'

const categoryOf = (id: string | null): Category => (id === 'lait' ? 'dairy' : 'other')

describe('lecture des données enregistrées', () => {
  it('garde les ingrédients valides tels quels', () => {
    const item = makeItem({ id: 'a', name: 'Lait' })
    expect(readStoredItems([item], categoryOf)).toEqual({ items: [item], unreadable: [] })
  })

  it('écarte et signale une date d’emballage sans valeur au lieu de planter', () => {
    const broken = { ...makeItem({ id: 'b', name: 'Yaourt' }), dateLabel: { kind: 'use-by' } }
    const r = readStoredItems([broken], categoryOf)
    expect(r.items).toEqual([])
    expect(r.unreadable).toEqual([{ id: 'b', name: 'Yaourt', problem: expect.stringMatching(/^dateLabel\.date/) }])
  })

  it('écarte et signale une quantité absente', () => {
    const broken: Record<string, unknown> = { ...makeItem({ id: 'c', name: 'Riz' }) }
    delete broken.quantity
    const r = readStoredItems([broken], categoryOf)
    expect(r.unreadable[0]).toMatchObject({ id: 'c', name: 'Riz', problem: expect.stringMatching(/^quantity/) })
  })

  it('ne se laisse pas perturber par une valeur qui n’est pas un objet', () => {
    const r = readStoredItems([null, 'texte', 42], categoryOf)
    expect(r.items).toEqual([])
    expect(r.unreadable).toHaveLength(3)
    expect(r.unreadable[0]).toMatchObject({ id: '(sans identifiant)', name: '(sans nom)' })
  })

  it('convertit à la volée un ancien enregistrement v0.1', () => {
    const v1 = { id: 'd', name: 'Lait', ingredientId: 'lait', quantity: 1, unit: 'pièce', location: 'frigo', expiresOn: '2026-04-01', createdAt: 'c', updatedAt: 'u' }
    const r = readStoredItems([v1], categoryOf)
    expect(r.unreadable).toEqual([])
    expect(r.items[0]).toMatchObject({ unit: 'unité', category: 'dairy', dateLabel: { kind: 'unspecified', date: '2026-04-01' } })
  })

  it('un enregistrement illisible n’empêche pas de lire les autres', () => {
    const ok = makeItem({ id: 'e', name: 'Œufs' })
    const r = readStoredItems([{ ...ok, id: 'f', dateLabel: { kind: 'use-by' } }, ok], categoryOf)
    expect(r.items.map((i) => i.id)).toEqual(['e'])
    expect(r.unreadable.map((i) => i.id)).toEqual(['f'])
  })
})
