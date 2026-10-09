import { z } from 'zod'
import type { CatalogIngredient, Category, InventoryItem, Leftover, Preparation } from './types'
import { inventoryItemSchema, leftoverSchema, preparationSchema } from './schemas'
import { migrateItemV1, type InventoryItemV1 } from './migrations'
import { inventoryItemToLeftover } from './leftovers'

export const BACKUP_FORMAT = 'mijote-backup'
export const BACKUP_VERSION = 3

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  inventory: InventoryItem[]
  staples: string[]
  favorites: string[]
  leftovers: Leftover[]
  preparations: Preparation[]
}

export interface BackupData {
  inventory: InventoryItem[]
  staples: string[]
  favorites: string[]
  leftovers: Leftover[]
  preparations: Preparation[]
}

export function createBackup(data: BackupData, now: Date = new Date()): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

const v2Schema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(2),
  exportedAt: z.string(),
  inventory: z.array(inventoryItemSchema),
  staples: z.array(z.string()),
  favorites: z.array(z.string()),
})

const v3Schema = v2Schema.extend({
  version: z.literal(3),
  leftovers: z.array(leftoverSchema),
  preparations: z.array(preparationSchema),
})

function invalid(error: z.ZodError): Error {
  const issue = error.issues[0]
  const list = issue?.path[0]
  const index = issue?.path[1]
  const what = list === 'inventory' ? 'ingrédient' : list === 'leftovers' ? 'reste' : list === 'preparations' ? 'préparation' : null
  const where = what && typeof index === 'number' ? ` (${what} n°${index + 1})` : ''
  return new Error(`Sauvegarde invalide${where} : elle n'a pas été importée et vos données actuelles sont intactes.`)
}

/** Sépare les anciens « restes cuisinés » de l'inventaire (sauvegardes v1/v2) pour en faire des restes. */
function splitLeftovers(inventory: InventoryItem[], catalog: ReadonlyMap<string, CatalogIngredient>) {
  return {
    inventory: inventory.filter((i) => i.status !== 'leftover'),
    leftovers: inventory.filter((i) => i.status === 'leftover').map((i) => inventoryItemToLeftover(i, catalog)),
  }
}

/** Lit un fichier de sauvegarde (v1, v2 ou v3) et le valide. Lève une erreur en français sinon. */
export function parseBackup(json: string, categoryOf: (id: string | null) => Category, catalog: ReadonlyMap<string, CatalogIngredient>): Backup {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error("Ce fichier n'est pas lisible : ce n'est pas une sauvegarde Mijoté.")
  }
  const head = z.object({ format: z.literal(BACKUP_FORMAT), version: z.number() }).safeParse(data)
  if (!head.success) throw new Error("Ce fichier n'est pas une sauvegarde Mijoté.")
  if (head.data.version > BACKUP_VERSION) {
    throw new Error('Cette sauvegarde vient d’une version plus récente de Mijoté. Mettez l’application à jour puis réessayez.')
  }

  if (head.data.version === 3) {
    const parsed = v3Schema.safeParse(data)
    if (!parsed.success) throw invalid(parsed.error)
    return parsed.data as Backup
  }

  let v2: z.infer<typeof v2Schema>
  if (head.data.version === 1) {
    const pantry = (data as { pantry?: unknown }).pantry
    if (!Array.isArray(pantry)) throw new Error('Sauvegarde incomplète : la liste des produits est absente.')
    const parsed = v2Schema.safeParse({
      format: BACKUP_FORMAT,
      version: 2,
      exportedAt: (data as { exportedAt?: string }).exportedAt ?? '',
      inventory: pantry.map((i) => migrateItemV1(i as InventoryItemV1, categoryOf)),
      staples: [],
      favorites: [],
    })
    if (!parsed.success) throw invalid(parsed.error)
    v2 = parsed.data
  } else {
    const parsed = v2Schema.safeParse(data)
    if (!parsed.success) throw invalid(parsed.error)
    v2 = parsed.data
  }
  const { inventory, leftovers } = splitLeftovers(v2.inventory as InventoryItem[], catalog)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: v2.exportedAt,
    inventory,
    staples: v2.staples,
    favorites: v2.favorites,
    leftovers,
    preparations: [],
  }
}
