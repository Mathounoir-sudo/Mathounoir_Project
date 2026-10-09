import { useLiveQuery } from 'dexie-react-hooks'
import { db, categoryOf } from '../lib/db'
import type { InventoryItem } from '../domain/types'
import { readStoredItems, type StoredInventory } from '../domain/stored'

/**
 * Données locales, mises à jour automatiquement à chaque modification.
 * `undefined` pendant le chargement initial (quelques millisecondes).
 * Les ingrédients sont validés à la lecture : un enregistrement illisible est signalé, jamais affiché tel quel.
 */
export function useStoredInventory(): StoredInventory | undefined {
  return useLiveQuery(async () => readStoredItems(await db.pantry.toArray(), categoryOf))
}

export function useInventory(): InventoryItem[] | undefined {
  return useStoredInventory()?.items
}

export function useStaples(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('staples')
    return new Set(Array.isArray(row?.value) ? (row.value as string[]) : [])
  })
}

export function useFavorites(): string[] | undefined {
  return useLiveQuery(async () => (await db.favorites.orderBy('savedAt').reverse().toArray()).map((f) => f.recipeId))
}
