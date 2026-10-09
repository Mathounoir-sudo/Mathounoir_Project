import type { Leftover, LeftoverStatus } from '../domain/types'
import type { LeftoverInput } from '../domain/schemas'
import { adjustQuantity } from '../domain/quantity'
import { cookedLinkFor } from '../domain/leftovers'
import { CATALOG_BY_ID } from '../data/catalog'
import { db as defaultDb, type MijoteDB } from '../lib/db'
import { UserFacingError, withStorage } from '../lib/errors'

const gone = () => new UserFacingError('Ce reste n’existe plus : il a peut-être été supprimé.')

/** Ingrédient correspondant d'un reste : seulement un ingrédient « cuisiné » du catalogue. */
function safeLink(input: LeftoverInput): string | null {
  return input.ingredientId && CATALOG_BY_ID.get(input.ingredientId)?.category === 'prepared' ? input.ingredientId : null
}

export function buildLeftover(
  input: LeftoverInput,
  extra: Pick<Leftover, 'source'> & Partial<Pick<Leftover, 'id' | 'recipeId' | 'preparationId'>>,
  now: string = new Date().toISOString(),
): Leftover {
  return {
    id: extra.id ?? crypto.randomUUID(),
    name: input.name.trim(),
    ingredientId: safeLink(input),
    quantity: input.quantity,
    unit: input.unit,
    preparedOn: input.preparedOn,
    limit: input.limit,
    status: 'available',
    note: input.note,
    recipeId: extra.recipeId ?? null,
    preparationId: extra.preparationId ?? null,
    source: extra.source,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  }
}

export async function addLeftover(input: LeftoverInput, database: MijoteDB = defaultDb): Promise<Leftover> {
  return withStorage('ajouter le reste', async () => {
    const leftover = buildLeftover(input, { source: 'manual' })
    await database.leftovers.add(leftover)
    return leftover
  })
}

export async function updateLeftover(id: string, input: LeftoverInput, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('enregistrer le reste', async () => {
    const updated = await database.leftovers.update(id, {
      name: input.name.trim(),
      ingredientId: safeLink(input),
      quantity: input.quantity,
      unit: input.unit,
      preparedOn: input.preparedOn,
      limit: input.limit,
      note: input.note,
      updatedAt: new Date().toISOString(),
    })
    if (updated === 0) throw gone()
  })
}

/** Bouton + / − : ajuste la quantité d'un pas (jamais sous zéro ; une quantité inconnue reste inconnue). */
export async function stepLeftover(id: string, direction: 1 | -1, database: MijoteDB = defaultDb): Promise<number | null> {
  return withStorage('modifier la quantité du reste', () =>
    database.transaction('rw', database.leftovers, async () => {
      const l = await database.leftovers.get(id)
      if (!l) throw gone()
      const quantity = adjustQuantity(l.quantity, l.unit, direction)
      await database.leftovers.update(id, { quantity, updatedAt: new Date().toISOString() })
      return quantity
    }),
  )
}

/** Consommé ou jeté : le reste quitte la liste des restes disponibles mais reste dans l'historique. */
export async function closeLeftover(id: string, status: Exclude<LeftoverStatus, 'available'>, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage(status === 'consumed' ? 'marquer le reste comme consommé' : 'marquer le reste comme jeté', async () => {
    const now = new Date().toISOString()
    const updated = await database.leftovers.update(id, { status, closedAt: now, updatedAt: now })
    if (updated === 0) throw gone()
  })
}

/** Remet un reste consommé ou jeté par erreur dans les restes disponibles. */
export async function reopenLeftover(id: string, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('remettre le reste dans la liste', async () => {
    const updated = await database.leftovers.update(id, { status: 'available', closedAt: null, updatedAt: new Date().toISOString() })
    if (updated === 0) throw gone()
  })
}

export async function deleteLeftover(id: string, database: MijoteDB = defaultDb): Promise<void> {
  return withStorage('supprimer le reste', () => database.leftovers.delete(id))
}

export async function getAllLeftovers(database: MijoteDB = defaultDb): Promise<Leftover[]> {
  return withStorage('lire les restes', () => database.leftovers.toArray())
}

/** Ingrédient cuisiné proposé pour un nom de reste (« Reste de riz » → riz cuit). */
export function suggestLeftoverLink(name: string): string | null {
  return cookedLinkFor(name, null, CATALOG_BY_ID)
}
