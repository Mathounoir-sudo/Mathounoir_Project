import { createBackup, parseBackup, type Backup } from '../domain/backup'
import { todayISO } from '../domain/dates'
import { db as defaultDb, categoryOf, type MijoteDB } from '../lib/db'
import { CATALOG_BY_ID } from '../data/catalog'
import { withStorage } from '../lib/errors'
import { getStaples } from './preferences'
import { getFavorites } from './recipes'

export async function exportBackup(database: MijoteDB = defaultDb): Promise<{ filename: string; json: string; count: number }> {
  const backup = createBackup({
    inventory: await withStorage('lire l’inventaire', () => database.pantry.toArray()),
    staples: await getStaples(database),
    favorites: await getFavorites(database),
    leftovers: await withStorage('lire les restes', () => database.leftovers.toArray()),
    preparations: await withStorage('lire l’historique des préparations', () => database.preparations.toArray()),
  })
  return {
    filename: `mijote-sauvegarde-${todayISO()}.json`,
    json: JSON.stringify(backup, null, 2),
    count: backup.inventory.length,
  }
}

/** Valide d'abord le fichier ; n'efface les données actuelles que si tout est valide. */
export function readBackup(json: string): Backup {
  return parseBackup(json, categoryOf, CATALOG_BY_ID)
}

export async function restoreBackup(backup: Backup, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('restaurer la sauvegarde', () =>
    database.transaction('rw', [database.pantry, database.settings, database.favorites, database.leftovers, database.preparations], async () => {
      await database.pantry.clear()
      await database.pantry.bulkAdd(backup.inventory)
      await database.settings.put({ key: 'staples', value: backup.staples })
      await database.favorites.clear()
      const now = new Date().toISOString()
      await database.favorites.bulkAdd(backup.favorites.map((recipeId) => ({ recipeId, savedAt: now })))
      await database.leftovers.clear()
      await database.leftovers.bulkAdd(backup.leftovers)
      await database.preparations.clear()
      await database.preparations.bulkAdd(backup.preparations)
    }),
  )
}
