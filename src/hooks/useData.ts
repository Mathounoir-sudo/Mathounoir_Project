import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, categoryOf } from '../lib/db'
import type { InventoryItem, Leftover } from '../domain/types'
import { readStoredLeftovers, type StoredLeftovers } from '../domain/leftovers'
import { readStoredItems, type StoredInventory } from '../domain/stored'
import { parseServings } from '../services/preferences'

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

/** Tous les restes (disponibles et historique), validés à la lecture. */
export function useStoredLeftovers(): StoredLeftovers | undefined {
  return useLiveQuery(async () => readStoredLeftovers(await db.leftovers.toArray()))
}

/** Restes encore disponibles. */
export function useAvailableLeftovers(): Leftover[] | undefined {
  const stored = useStoredLeftovers()
  return useMemo(() => stored?.leftovers.filter((l) => l.status === 'available'), [stored])
}

export function useStaples(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('staples')
    return new Set(Array.isArray(row?.value) ? (row.value as string[]) : [])
  })
}

/** Nombre de portions mémorisé (1 par défaut, valeur invalide ignorée). */
export function useServings(): number | undefined {
  return useLiveQuery(async () => parseServings((await db.settings.get('servings'))?.value))
}

export function useFavorites(): string[] | undefined {
  return useLiveQuery(async () => (await db.favorites.orderBy('savedAt').reverse().toArray()).map((f) => f.recipeId))
}
