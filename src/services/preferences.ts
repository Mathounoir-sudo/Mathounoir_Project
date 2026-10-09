import { db as defaultDb, type MijoteDB } from '../lib/db'
import { withStorage } from '../lib/errors'

const STAPLES_KEY = 'staples'

/** Basiques (sel, huile…) que l'utilisateur a confirmé avoir chez lui. */
export async function getStaples(database: MijoteDB = defaultDb): Promise<string[]> {
  return withStorage('lire vos basiques', async () => {
    const row = await database.settings.get(STAPLES_KEY)
    return Array.isArray(row?.value) ? (row.value as string[]) : []
  })
}

export async function setStaples(ids: string[], database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('enregistrer vos basiques', async () => {
    await database.settings.put({ key: STAPLES_KEY, value: [...new Set(ids)].sort() })
  })
}

export async function toggleStaple(id: string, database: MijoteDB = defaultDb): Promise<void> {
  const current = new Set(await getStaples(database))
  if (current.has(id)) current.delete(id)
  else current.add(id)
  await setStaples([...current], database)
}
