import type { PantryItem } from './types'
import { LOCATIONS, UNITS } from './types'

export const BACKUP_FORMAT = 'mijote-backup'
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  pantry: PantryItem[]
}

export function createBackup(pantry: PantryItem[], now: Date = new Date()): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), pantry }
}

function isPantryItem(value: unknown): value is PantryItem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const dateOrNull = (d: unknown) => d === null || (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    (v.ingredientId === null || typeof v.ingredientId === 'string') &&
    (v.quantity === null || typeof v.quantity === 'number') &&
    UNITS.includes(v.unit as never) &&
    LOCATIONS.includes(v.location as never) &&
    dateOrNull(v.expiresOn) &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  )
}

/** Lit un fichier de sauvegarde et vérifie qu'il est valide. Lève une erreur lisible sinon. */
export function parseBackup(json: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Mijoté valide.")
  }
  const d = data as Partial<Backup>
  if (d?.format !== BACKUP_FORMAT || !Array.isArray(d.pantry)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Mijoté.")
  }
  if (typeof d.version !== 'number' || d.version > BACKUP_VERSION) {
    throw new Error('Cette sauvegarde vient d’une version plus récente de Mijoté. Mettez l’application à jour.')
  }
  const invalid = d.pantry.findIndex((item) => !isPantryItem(item))
  if (invalid !== -1) throw new Error(`Le produit n°${invalid + 1} de la sauvegarde est invalide.`)
  return d as Backup
}
