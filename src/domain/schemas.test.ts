import { describe, expect, it } from 'vitest'
import { fieldErrors, inventoryFormSchema, recipeSchema, type InventoryFormValues } from './schemas'
import { DEMO_RECIPES_RAW } from '../data/demo-recipes'
import { CATALOG_BY_ID } from '../data/catalog'

const base: InventoryFormValues = {
  ingredientId: 'lait',
  name: 'Lait',
  category: 'dairy',
  quantity: '1,5',
  unit: 'l',
  location: 'fridge',
  status: 'opened',
  purchasedOn: '',
  openedOn: '2026-03-28',
  dateKind: 'use-by',
  date: '2026-04-02',
  urgent: false,
}

describe('formulaire d’ingrédient', () => {
  it('transforme une saisie valide', () => {
    expect(inventoryFormSchema.parse(base)).toEqual({
      name: 'Lait',
      ingredientId: 'lait',
      category: 'dairy',
      quantity: 1.5,
      unit: 'l',
      location: 'fridge',
      status: 'opened',
      purchasedOn: null,
      openedOn: '2026-03-28',
      dateLabel: { kind: 'use-by', date: '2026-04-02' },
      urgent: false,
    })
  })

  it('accepte une quantité et une date absentes', () => {
    const r = inventoryFormSchema.parse({ ...base, ingredientId: '', quantity: '', dateKind: '', date: '', location: '' })
    expect(r.ingredientId).toBeNull()
    expect(r.quantity).toBeNull()
    expect(r.dateLabel).toBeNull()
    expect(r.location).toBeNull()
  })

  it.each([
    [{ name: '  ' }, 'name', 'Indiquez le nom'],
    [{ quantity: '-3' }, 'quantity', 'nombre positif'],
    [{ quantity: 'beaucoup' }, 'quantity', 'nombre positif'],
    [{ dateKind: '' as const }, 'dateKind', 'type de date'],
    [{ date: '' }, 'date', 'Indiquez la date'],
    [{ purchasedOn: '2026-03-29', openedOn: '2026-03-28' }, 'openedOn', 'précéder'],
  ])('refuse %o avec un message clair', (patch, field, message) => {
    const r = inventoryFormSchema.safeParse({ ...base, ...patch })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error)[field]).toContain(message)
  })
})

describe('recettes de démonstration', () => {
  it.each(DEMO_RECIPES_RAW.map((r) => [(r as { id: string }).id, r]))('« %s » respecte le schéma', (_, r) => {
    expect(() => recipeSchema.parse(r)).not.toThrow()
  })

  it('n’utilisent que des ingrédients du catalogue', () => {
    for (const r of DEMO_RECIPES_RAW.map((x) => recipeSchema.parse(x))) {
      for (const i of r.ingredients) expect(CATALOG_BY_ID.has(i.ingredientId), `${r.id} → ${i.ingredientId}`).toBe(true)
    }
  })

  it('refuse une recette malformée', () => {
    expect(recipeSchema.safeParse({ id: 'x', title: 'Sans étapes', steps: [] }).success).toBe(false)
  })
})
