import type { Category, InventoryItem, Unit } from './types'
import { UNITS } from './types'

/** Forme d'un produit enregistré par la version 0.1 de Mijoté (schéma de base n°1). */
export interface InventoryItemV1 {
  id: string
  name: string
  ingredientId: string | null
  quantity: number | null
  unit: string
  location: 'frigo' | 'placard' | 'congélateur'
  expiresOn: string | null
  createdAt: string
  updatedAt: string
}

const LOCATION_V1 = { frigo: 'fridge', placard: 'pantry', congélateur: 'freezer' } as const

/**
 * Convertit un produit v1 en v2, sans rien inventer :
 * - l'ancienne date « à consommer avant » ne précisait pas DLC ou DDM → type « non précisé » ;
 * - l'état n'était pas demandé → « non entamé », ou « congelé » s'il était au congélateur.
 */
export function migrateItemV1(old: InventoryItemV1, categoryOf: (ingredientId: string | null) => Category): InventoryItem {
  const unit: Unit = old.unit === 'pièce' ? 'unité' : UNITS.includes(old.unit as Unit) ? (old.unit as Unit) : 'unité'
  const location = LOCATION_V1[old.location] ?? null
  return {
    id: old.id,
    name: old.name,
    ingredientId: old.ingredientId,
    category: categoryOf(old.ingredientId),
    quantity: old.quantity,
    unit,
    location,
    status: location === 'freezer' ? 'frozen' : 'unopened',
    purchasedOn: null,
    openedOn: null,
    dateLabel: old.expiresOn ? { kind: 'unspecified', date: old.expiresOn } : null,
    urgent: false,
    source: 'manual',
    confirmed: true,
    linkConfirmed: false,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
  }
}
