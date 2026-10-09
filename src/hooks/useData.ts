import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { InventoryItem } from '../domain/types'

/**
 * Données locales, mises à jour automatiquement à chaque modification.
 * `undefined` pendant le chargement initial (quelques millisecondes).
 */
export function useInventory(): InventoryItem[] | undefined {
  return useLiveQuery(() => db.pantry.toArray())
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
