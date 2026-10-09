import type { Deduction, Preparation, Recipe } from '../domain/types'
import type { LeftoverInput } from '../domain/schemas'
import { applyUse, validatePortions, validateUses, type StockState, type UsePlan } from '../domain/preparation'
import { db as defaultDb, type MijoteDB } from '../lib/db'
import { UserFacingError, withStorage } from '../lib/errors'
import { buildLeftover } from './leftovers'

export interface PreparationInput {
  /** Identifiant unique de la préparation, fixé à l'ouverture du formulaire : clé anti-doublon. */
  id: string
  recipe: Recipe
  servings: number
  eatenServings: number
  uses: UsePlan[]
  /** Reste à conserver, ou null si rien n'est gardé. */
  leftover: LeftoverInput | null
}

export interface RecordResult {
  status: 'recorded' | 'already-recorded'
  preparation: Preparation
}

/**
 * Enregistre une préparation en UNE transaction IndexedDB (inventaire + restes + historique) :
 * soit tout est écrit, soit rien (en cas d'erreur, la transaction est annulée).
 *
 * Anti-doublon : si une préparation avec le même identifiant existe déjà (double clic, nouvelle tentative,
 * rechargement), rien n'est déduit une seconde fois et la préparation existante est renvoyée.
 * Le stock est relu DANS la transaction : une quantité modifiée entre-temps est revérifiée.
 */
export async function recordPreparation(input: PreparationInput, database: MijoteDB = defaultDb): Promise<RecordResult> {
  return withStorage('enregistrer la préparation', () =>
    database.transaction('rw', [database.pantry, database.leftovers, database.preparations], async () => {
      const existing = await database.preparations.get(input.id)
      if (existing) return { status: 'already-recorded' as const, preparation: existing }

      const portionsError = validatePortions(input.servings, input.eatenServings)
      if (portionsError) throw new UserFacingError(portionsError)

      // Relecture du stock actuel pour chaque produit concerné.
      const active = input.uses.filter((u) => u.mode !== 'none')
      const stock = new Map<string, StockState>()
      for (const use of active) {
        const current =
          use.stockKind === 'inventory'
            ? await database.pantry.get(use.stockId)
            : await database.leftovers.get(use.stockId).then((l) => (l && l.status === 'available' ? l : undefined))
        if (!current) continue
        if (current.unit !== use.unit) {
          throw new UserFacingError(`« ${use.name} » a été modifié entre-temps (unité différente) : rouvrez la préparation pour vérifier les quantités.`)
        }
        stock.set(use.stockId, { quantity: current.quantity, unit: current.unit, name: current.name })
      }
      const errors = validateUses(active, stock)
      const firstError = Object.entries(errors)[0]
      if (firstError) {
        const name = active.find((u) => u.stockId === firstError[0])?.name
        throw new UserFacingError(`${name ? `${name} : ` : ''}${firstError[1]}`)
      }

      const now = new Date().toISOString()
      const deductions: Deduction[] = []
      for (const use of active) {
        const before = stock.get(use.stockId)!.quantity
        const after = applyUse(before, use)
        if (use.stockKind === 'inventory') {
          await database.pantry.update(use.stockId, { quantity: after.quantity, updatedAt: now })
        } else {
          await database.leftovers.update(use.stockId, {
            quantity: after.quantity,
            updatedAt: now,
            // Un reste entièrement utilisé est consommé.
            ...(after.finished ? { status: 'consumed' as const, closedAt: now } : {}),
          })
        }
        deductions.push({
          stockId: use.stockId,
          stockKind: use.stockKind,
          name: use.name,
          ingredientId: use.ingredientId,
          quantity: after.deducted,
          unit: use.unit,
          finished: after.finished,
        })
      }

      let leftoverId: string | null = null
      if (input.leftover) {
        const leftover = buildLeftover(input.leftover, { source: 'recipe', recipeId: input.recipe.id, preparationId: input.id }, now)
        await database.leftovers.add(leftover)
        leftoverId = leftover.id
      }

      const preparation: Preparation = {
        id: input.id,
        recipeId: input.recipe.id,
        recipeTitle: input.recipe.title,
        servings: input.servings,
        eatenServings: input.eatenServings,
        deductions,
        leftoverId,
        createdAt: now,
      }
      await database.preparations.add(preparation)
      return { status: 'recorded' as const, preparation }
    }),
  )
}

export async function getPreparation(id: string, database: MijoteDB = defaultDb): Promise<Preparation | undefined> {
  return withStorage('lire la préparation', () => database.preparations.get(id))
}
