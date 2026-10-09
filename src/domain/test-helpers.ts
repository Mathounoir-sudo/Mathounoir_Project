import type { InventoryItem } from './types'

/** Fabrique un ingrédient d'inventaire pour les tests. */
export function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: overrides.ingredientId ?? 'id',
    name: overrides.ingredientId ?? 'Produit',
    ingredientId: null,
    category: 'other',
    quantity: 1,
    unit: 'unité',
    location: 'fridge',
    status: 'unopened',
    purchasedOn: null,
    openedOn: null,
    dateLabel: null,
    urgent: false,
    source: 'manual',
    confirmed: true,
    createdAt: '2026-03-30T10:00:00.000Z',
    updatedAt: '2026-03-30T10:00:00.000Z',
    ...overrides,
  }
}
