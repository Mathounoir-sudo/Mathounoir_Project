import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { compareByExpiry } from '../../domain/dates'
import type { PantryItem } from '../../domain/types'

/** Le garde-manger trié par date limite, mis à jour automatiquement. `undefined` pendant le chargement. */
export function usePantry(): PantryItem[] | undefined {
  return useLiveQuery(async () => {
    const items = await db.pantry.toArray()
    return items.sort((a, b) => compareByExpiry(a.expiresOn, b.expiresOn) || a.name.localeCompare(b.name, 'fr'))
  })
}
