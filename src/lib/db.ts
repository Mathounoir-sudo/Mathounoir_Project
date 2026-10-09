import Dexie, { type EntityTable } from 'dexie'
import type { InventoryItem, Leftover, Preparation } from '../domain/types'
import { migrateItemV1, type InventoryItemV1 } from '../domain/migrations'
import { inventoryItemToLeftover } from '../domain/leftovers'
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
  leftovers!: EntityTable<Leftover, 'id'>
  preparations!: EntityTable<Preparation, 'id'>

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
    // v3 (phase 3) : les restes ont leur propre table. Les produits de l'inventaire marqués « Reste cuisiné »
    // y sont DÉPLACÉS (copiés puis retirés de l'inventaire) dans la même transaction : tout ou rien.
    this.version(3)
      .stores({
        leftovers: 'id, status, recipeId, preparationId, updatedAt',
        preparations: 'id, recipeId, createdAt',
      })
      .upgrade(async (tx) => {
        const pantry = tx.table('pantry')
        const old = (await pantry.toArray()) as InventoryItem[]
        const moved: Leftover[] = []
        for (const item of old) {
          if (!item || typeof item !== 'object' || item.status !== 'leftover') continue
          try {
            moved.push(inventoryItemToLeftover(item, CATALOG_BY_ID))
          } catch (error) {
            // Enregistrement incomplet : il reste dans l'inventaire (signalé comme illisible), rien n'est perdu.
            console.warn('Reste non converti, laissé dans l’inventaire :', item, error)
          }
        }
        if (moved.length === 0) return
        await tx.table('leftovers').bulkAdd(moved)
        await pantry.bulkDelete(moved.map((l) => l.id))
      })
  }
}

export const db = new MijoteDB()
