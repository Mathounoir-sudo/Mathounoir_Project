import { db as defaultDb, type MijoteDB } from '../lib/db'
import { withStorage } from '../lib/errors'

const STAPLES_KEY = 'staples'
const SERVINGS_KEY = 'servings'

export const MIN_SERVINGS = 1
export const MAX_SERVINGS = 8
export const DEFAULT_SERVINGS = 1

/** Lit une valeur de portions enregistrée ; une valeur invalide donne la valeur par défaut. */
export function parseServings(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_SERVINGS && value <= MAX_SERVINGS
    ? value
    : DEFAULT_SERVINGS
}

/** Nombre de portions souhaité pour les suggestions (mémorisé sur l'appareil). */
export async function getServings(database: MijoteDB = defaultDb): Promise<number> {
  return withStorage('lire le nombre de portions', async () => parseServings((await database.settings.get(SERVINGS_KEY))?.value))
}

export async function setServings(servings: number, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('enregistrer le nombre de portions', async () => {
    await database.settings.put({ key: SERVINGS_KEY, value: parseServings(servings) })
  })
}

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
