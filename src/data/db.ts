import Dexie, { type EntityTable } from 'dexie'
import type { Location, PantryItem, Unit } from '../domain/types'
import { buildMatchers, matchIngredient } from '../domain/ingredients'
import { INGREDIENTS } from './ingredients'

/**
 * Base de données locale (IndexedDB), stockée uniquement dans le navigateur.
 *
 * ⚠️ Pour modifier la structure : ne jamais changer une version existante,
 * ajouter un nouveau `this.version(N + 1)` avec, si besoin, un `.upgrade()`
 * qui convertit les données déjà enregistrées sur les téléphones.
 */
export class MijoteDB extends Dexie {
  pantry!: EntityTable<PantryItem, 'id'>

  constructor(name = 'mijote') {
    super(name)
    this.version(1).stores({
      // Seuls les champs listés ici sont indexés (recherche/tri) ; les autres sont stockés quand même.
      pantry: 'id, ingredientId, expiresOn, location, updatedAt',
    })
  }
}

export const db = new MijoteDB()

const matchers = buildMatchers(INGREDIENTS)

export interface PantryInput {
  name: string
  quantity: number | null
  unit: Unit
  location: Location
  expiresOn: string | null
}

export async function addPantryItem(input: PantryInput, database: MijoteDB = db): Promise<PantryItem> {
  const now = new Date().toISOString()
  const item: PantryItem = {
    id: crypto.randomUUID(),
    ...input,
    name: input.name.trim(),
    ingredientId: matchIngredient(input.name, matchers),
    createdAt: now,
    updatedAt: now,
  }
  await database.pantry.add(item)
  return item
}

export async function updatePantryItem(id: string, input: PantryInput, database: MijoteDB = db): Promise<void> {
  await database.pantry.update(id, {
    ...input,
    name: input.name.trim(),
    ingredientId: matchIngredient(input.name, matchers),
    updatedAt: new Date().toISOString(),
  })
}

export async function deletePantryItem(id: string, database: MijoteDB = db): Promise<void> {
  await database.pantry.delete(id)
}

/** Remplace tout le garde-manger (utilisé lors d'une restauration de sauvegarde). */
export async function replacePantry(items: PantryItem[], database: MijoteDB = db): Promise<void> {
  await database.transaction('rw', database.pantry, async () => {
    await database.pantry.clear()
    await database.pantry.bulkAdd(items)
  })
}

export async function getAllPantry(database: MijoteDB = db): Promise<PantryItem[]> {
  return database.pantry.toArray()
}
