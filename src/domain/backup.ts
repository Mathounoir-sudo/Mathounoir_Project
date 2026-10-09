import { z } from 'zod'
import type { Category, InventoryItem } from './types'
import { inventoryItemSchema } from './schemas'
import { migrateItemV1, type InventoryItemV1 } from './migrations'

export const BACKUP_FORMAT = 'mijote-backup'
export const BACKUP_VERSION = 2

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  inventory: InventoryItem[]
  staples: string[]
  favorites: string[]
}

export function createBackup(
  data: { inventory: InventoryItem[]; staples: string[]; favorites: string[] },
  now: Date = new Date(),
): Backup {
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

/** Lit un fichier de sauvegarde (v1 ou v2) et le valide. Lève une erreur en français sinon. */
export function parseBackup(json: string, categoryOf: (id: string | null) => Category): Backup {
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
  if (head.data.version === 1) {
    const pantry = (data as { pantry?: unknown }).pantry
    if (!Array.isArray(pantry)) throw new Error('Sauvegarde incomplète : la liste des produits est absente.')
    data = createBackup({
      inventory: pantry.map((i) => migrateItemV1(i as InventoryItemV1, categoryOf)),
      staples: [],
      favorites: [],
    })
  }
  const parsed = v2Schema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path[0] === 'inventory' && typeof issue.path[1] === 'number' ? ` (ingrédient n°${issue.path[1] + 1})` : ''
    throw new Error(`Sauvegarde invalide${where} : elle n'a pas été importée et vos données actuelles sont intactes.`)
  }
  return parsed.data as Backup
}
