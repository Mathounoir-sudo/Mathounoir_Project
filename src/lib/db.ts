import Dexie, { type EntityTable } from 'dexie'
import type { InventoryItem } from '../domain/types'
import { migrateItemV1, type InventoryItemV1 } from '../domain/migrations'
import { CATALOG_BY_ID } from '../data/catalog'

export interface FavoriteRow {
  recipeId: string
  savedAt: string
}

export interface SettingRow {
  key: string
  value: unknown
}

export const categoryOf = (ingredientId: string | null) =>
  (ingredientId && CATALOG_BY_ID.get(ingredientId)?.category) || 'other'

/**
 * Base de données locale (IndexedDB), stockée uniquement dans ce navigateur.
 *
 * ⚠️ Pour modifier la structure : ne jamais changer une version existante,
 * ajouter un `this.version(N + 1)` avec un `.upgrade()` qui convertit les données déjà enregistrées.
 * (La table s'appelle `pantry` depuis la v1 ; on garde ce nom pour ne pas perdre de données.)
 */
export class MijoteDB extends Dexie {
  pantry!: EntityTable<InventoryItem, 'id'>
  favorites!: EntityTable<FavoriteRow, 'recipeId'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'mijote') {
    super(name)
    this.version(1).stores({
      pantry: 'id, ingredientId, expiresOn, location, updatedAt',
    })
    this.version(2)
      .stores({
        pantry: 'id, ingredientId, category, updatedAt',
        favorites: 'recipeId, savedAt',
        settings: 'key',
      })
      .upgrade((tx) =>
        tx
          .table('pantry')
          .toCollection()
          .modify((item, ref) => {
            ref.value = migrateItemV1(item as InventoryItemV1, categoryOf)
          }),
      )
  }
}

export const db = new MijoteDB()
