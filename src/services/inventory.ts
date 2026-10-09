import type { InventoryInput, InventoryItem } from '../domain/types'
import { adjustQuantity } from '../domain/quantity'
import { todayISO } from '../domain/dates'
import { demoInventory, demoLeftovers } from '../data/demo-inventory'
import { buildLeftover } from './leftovers'
import { db as defaultDb, type MijoteDB } from '../lib/db'
import { UserFacingError, withStorage } from '../lib/errors'

/**
 * Le lien vers le catalogue (`ingredientId`, ou aucun) est celui validé dans le formulaire
 * (ou fixé dans les données de démonstration) : il est donc confirmé.
 */
function build(input: InventoryInput, source: InventoryItem['source'], now: string): InventoryItem {
  return {
    ...input,
    id: crypto.randomUUID(),
    name: input.name.trim(),
    source,
    confirmed: true,
    linkConfirmed: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function addItem(input: InventoryInput, database: MijoteDB = defaultDb): Promise<InventoryItem> {
  return withStorage('ajouter l’ingrédient', async () => {
    const item = build(input, 'manual', new Date().toISOString())
    await database.pantry.add(item)
    return item
  })
}

export async function updateItem(id: string, input: InventoryInput, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('enregistrer les modifications', async () => {
    const updated = await database.pantry.update(id, {
      ...input,
      name: input.name.trim(),
      // Une modification par l'utilisateur vaut confirmation, y compris du lien vers le catalogue.
      confirmed: true,
      linkConfirmed: true,
      updatedAt: new Date().toISOString(),
    })
    if (updated === 0) throw new UserFacingError('Cet ingrédient n’existe plus : il a peut-être été supprimé.')
  })
}

export async function deleteItem(id: string, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('supprimer l’ingrédient', () => database.pantry.delete(id))
}

/** Bouton + / − : ajuste d'un pas adapté à l'unité. Renvoie la nouvelle quantité. */
export async function stepQuantity(id: string, direction: 1 | -1, database: MijoteDB = defaultDb): Promise<number | null> {
  return withStorage('modifier la quantité', async () =>
    database.transaction('rw', database.pantry, async () => {
      const item = await database.pantry.get(id)
      if (!item) throw new UserFacingError('Cet ingrédient n’existe plus : il a peut-être été supprimé.')
      const quantity = adjustQuantity(item.quantity, item.unit, direction)
      await database.pantry.update(id, { quantity, updatedAt: new Date().toISOString() })
      return quantity
    }),
  )
}

export async function getItem(id: string, database: MijoteDB = defaultDb): Promise<InventoryItem | undefined> {
  return withStorage('lire l’ingrédient', () => database.pantry.get(id))
}

export async function getAllItems(database: MijoteDB = defaultDb): Promise<InventoryItem[]> {
  return withStorage('lire l’inventaire', () => database.pantry.toArray())
}

/** Ajoute les ingrédients fictifs de démonstration. Renvoie le nombre ajouté. */
export async function loadDemoInventory(database: MijoteDB = defaultDb, today = todayISO()): Promise<number> {
  return withStorage('charger les données de démonstration', () =>
    database.transaction('rw', database.pantry, database.leftovers, async () => {
      const now = new Date().toISOString()
      const items = demoInventory(today).map((input) => build(input, 'demo', now))
      const leftovers = demoLeftovers(today).map((input) => buildLeftover(input, { source: 'demo' }, now))
      await database.pantry.bulkAdd(items)
      await database.leftovers.bulkAdd(leftovers)
      return items.length + leftovers.length
    }),
  )
}

/** Retire uniquement les ingrédients et restes de démonstration ; ceux saisis par l'utilisateur restent. */
export async function removeDemoInventory(database: MijoteDB = defaultDb): Promise<number> {
  return withStorage('retirer les données de démonstration', () =>
    database.transaction('rw', database.pantry, database.leftovers, async () => {
      const items = await database.pantry.filter((i) => i.source === 'demo').delete()
      const leftovers = await database.leftovers.filter((l) => l.source === 'demo').delete()
      return items + leftovers
    }),
  )
}

export async function clearInventory(database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('vider l’inventaire', () => database.pantry.clear())
}

/** Efface les restes et l'historique des préparations (utilisé par « Effacer toutes mes données »). */
export async function clearLeftoversAndHistory(database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('effacer les restes', () =>
    database.transaction('rw', database.leftovers, database.preparations, async () => {
      await database.leftovers.clear()
      await database.preparations.clear()
    }),
  )
}
