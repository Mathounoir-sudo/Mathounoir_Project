import type { Category, InventoryItem } from './types'
import { inventoryItemSchema } from './schemas'
import { migrateItemV1, type InventoryItemV1 } from './migrations'

/** Enregistrement présent dans la base locale mais inutilisable par cette version de l'app. */
export interface UnreadableItem {
  id: string
  name: string
  problem: string
}

export interface StoredInventory {
  items: InventoryItem[]
  unreadable: UnreadableItem[]
}

/** Ancien format (v0.1) : il a une date `expiresOn` mais pas d'état. */
function looksLikeV1(raw: object): boolean {
  return 'expiresOn' in raw && !('status' in raw)
}

/**
 * Valide les ingrédients lus dans la base locale AVANT de les afficher.
 * - un ancien format v0.1 est converti à la volée (sans réécrire la base) ;
 * - un enregistrement illisible est écarté de l'affichage et signalé, mais n'est jamais supprimé.
 * Ainsi, une seule donnée inattendue ne peut plus faire planter tout l'écran.
 */
export function readStoredItems(raw: unknown[], categoryOf: (id: string | null) => Category): StoredInventory {
  const items: InventoryItem[] = []
  const unreadable: UnreadableItem[] = []
  for (const record of raw) {
    const candidate =
      typeof record === 'object' && record !== null && looksLikeV1(record)
        ? migrateItemV1(record as InventoryItemV1, categoryOf)
        : record
    const parsed = inventoryItemSchema.safeParse(candidate)
    if (parsed.success) {
      items.push(parsed.data)
      continue
    }
    const r = (typeof record === 'object' && record !== null ? record : {}) as Record<string, unknown>
    const issue = parsed.error.issues[0]
    unreadable.push({
      id: typeof r.id === 'string' ? r.id : '(sans identifiant)',
      name: typeof r.name === 'string' && r.name.trim() ? r.name : '(sans nom)',
      problem: `${issue?.path.join('.') || 'enregistrement'} : ${issue?.message ?? 'format inattendu'}`,
    })
  }
  return { items, unreadable }
}
