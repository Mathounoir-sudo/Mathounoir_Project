import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { MijoteDB } from '../lib/db'
import type { InventoryInput, LeftoverStatus } from '../domain/types'
import type { LeftoverInput } from '../domain/schemas'
import type { UsePlan } from '../domain/preparation'
import { addItem, getItem } from './inventory'
import { addLeftover, closeLeftover, deleteLeftover, reopenLeftover, stepLeftover, updateLeftover } from './leftovers'
import { recordPreparation, type PreparationInput } from './preparations'
import { findRecipe } from './recipes'
import { exportBackup, readBackup, restoreBackup } from './backup'

const opened: MijoteDB[] = []
let counter = 0
function freshDb(name = `p3-${++counter}`) {
  const d = new MijoteDB(name)
  opened.push(d)
  return d
}
afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
})

const item = (overrides: Partial<InventoryInput>): InventoryInput => ({
  name: 'Œufs',
  ingredientId: 'oeuf',
  category: 'egg',
  quantity: 6,
  unit: 'unité',
  location: 'fridge',
  status: 'unopened',
  purchasedOn: null,
  openedOn: null,
  dateLabel: null,
  urgent: false,
  ...overrides,
})

const leftoverInput = (overrides: Partial<LeftoverInput> = {}): LeftoverInput => ({
  name: 'Reste d’omelette',
  ingredientId: null,
  quantity: 1,
  unit: 'portion',
  preparedOn: '2026-03-30',
  limit: null,
  note: null,
  ...overrides,
})

const use = (stockId: string, overrides: Partial<UsePlan> = {}): UsePlan => ({
  stockId,
  stockKind: 'inventory',
  ingredientId: 'oeuf',
  name: 'Œufs',
  unit: 'unité',
  available: 6,
  mode: 'amount',
  quantity: 3,
  ...overrides,
})

const omelette = findRecipe('omelette-vide-frigo')!
const prep = (overrides: Partial<PreparationInput>): PreparationInput => ({
  id: crypto.randomUUID(),
  recipe: omelette,
  servings: 1,
  eatenServings: 1,
  uses: [],
  leftover: null,
  ...overrides,
})

describe('préparation d’une recette', () => {
  it('enregistre la préparation et déduit uniquement les quantités confirmées', async () => {
    const db = freshDb()
    const eggs = await addItem(item({}), db)
    const cheese = await addItem(item({ name: 'Emmental', ingredientId: 'fromage-rape', quantity: 100, unit: 'g' }), db)
    const r = await recordPreparation(
      prep({ uses: [use(eggs.id), use(cheese.id, { ingredientId: 'fromage-rape', unit: 'g', mode: 'none', quantity: 20 })] }),
      db,
    )
    expect(r.status).toBe('recorded')
    expect((await getItem(eggs.id, db))?.quantity).toBe(3)
    expect((await getItem(cheese.id, db))?.quantity).toBe(100)
    expect(r.preparation.deductions).toEqual([expect.objectContaining({ stockId: eggs.id, quantity: 3, unit: 'unité', finished: false })])
  })

  it('refuse un stock négatif et n’écrit rien', async () => {
    const db = freshDb()
    const eggs = await addItem(item({ quantity: 2 }), db)
    await expect(recordPreparation(prep({ uses: [use(eggs.id, { quantity: 3 })] }), db)).rejects.toThrow(/Vous en avez 2 unités/)
    expect((await getItem(eggs.id, db))?.quantity).toBe(2)
    expect(await db.preparations.count()).toBe(0)
  })

  it('refuse de déduire une quantité d’un stock inconnu ; « il n’en reste plus » est accepté explicitement', async () => {
    const db = freshDb()
    const eggs = await addItem(item({ quantity: null }), db)
    await expect(recordPreparation(prep({ uses: [use(eggs.id)] }), db)).rejects.toThrow(/Quantité inconnue/)
    expect((await getItem(eggs.id, db))?.quantity).toBeNull()
    const r = await recordPreparation(prep({ uses: [use(eggs.id, { mode: 'finish', quantity: null })] }), db)
    expect((await getItem(eggs.id, db))?.quantity).toBe(0)
    expect(r.preparation.deductions[0]).toMatchObject({ quantity: null, finished: true })
  })

  it('enregistre les portions restantes comme un reste relié à la recette, qui persiste à la réouverture', async () => {
    const name = `p3-persist-${++counter}`
    const db = new MijoteDB(name)
    const eggs = await addItem(item({}), db)
    const r = await recordPreparation(
      prep({ servings: 2, eatenServings: 1, uses: [use(eggs.id, { quantity: 6 })], leftover: leftoverInput({ quantity: 1 }) }),
      db,
    )
    db.close()
    const reopened = freshDb(name)
    const [left] = await reopened.leftovers.toArray()
    expect(left).toMatchObject({
      id: r.preparation.leftoverId,
      name: 'Reste d’omelette',
      quantity: 1,
      unit: 'portion',
      status: 'available',
      recipeId: 'omelette-vide-frigo',
      preparationId: r.preparation.id,
      source: 'recipe',
    })
    expect((await getItem(eggs.id, reopened))?.quantity).toBe(0)
  })

  it('ne déduit jamais deux fois : double clic simultané et nouvelle tentative', async () => {
    const db = freshDb()
    const eggs = await addItem(item({}), db)
    const input = prep({ uses: [use(eggs.id)], leftover: leftoverInput() })
    const [a, b] = await Promise.all([recordPreparation(input, db), recordPreparation(input, db)])
    expect([a.status, b.status].sort()).toEqual(['already-recorded', 'recorded'])
    const retry = await recordPreparation(input, db)
    expect(retry.status).toBe('already-recorded')
    expect((await getItem(eggs.id, db))?.quantity).toBe(3)
    expect(await db.leftovers.count()).toBe(1)
    expect(await db.preparations.count()).toBe(1)
  })

  it('peut utiliser un reste : il est consommé quand tout est utilisé', async () => {
    const db = freshDb()
    const rice = await addLeftover(leftoverInput({ name: 'Reste de riz', ingredientId: 'riz-cuit', quantity: 150, unit: 'g' }), db)
    await recordPreparation(
      prep({
        recipe: findRecipe('riz-saute')!,
        uses: [use(rice.id, { stockKind: 'leftover', ingredientId: 'riz-cuit', name: 'Reste de riz', unit: 'g', available: 150, quantity: 150 })],
      }),
      db,
    )
    expect(await db.leftovers.get(rice.id)).toMatchObject({ quantity: 0, status: 'consumed' })
  })

  it('revérifie le stock au moment d’enregistrer (modifié entre-temps)', async () => {
    const db = freshDb()
    const eggs = await addItem(item({}), db)
    await db.pantry.update(eggs.id, { quantity: 1 })
    await expect(recordPreparation(prep({ uses: [use(eggs.id)] }), db)).rejects.toThrow(/Vous en avez 1 unité/)
  })

  it('refuse des portions incohérentes', async () => {
    const db = freshDb()
    await expect(recordPreparation(prep({ servings: 2, eatenServings: 3 }), db)).rejects.toThrow(/plus de 2 portions/)
  })
})

describe('gestion des restes', () => {
  it('modifie, ajuste, consomme, jette, remet et supprime un reste', async () => {
    const db = freshDb()
    const r = await addLeftover(leftoverInput({ quantity: 2 }), db)
    await updateLeftover(r.id, leftoverInput({ name: 'Omelette froide', quantity: 3, limit: { kind: 'use-by', date: '2026-04-01' } }), db)
    expect(await db.leftovers.get(r.id)).toMatchObject({ name: 'Omelette froide', quantity: 3, limit: { kind: 'use-by', date: '2026-04-01' } })
    expect(await stepLeftover(r.id, -1, db)).toBe(2)

    for (const status of ['consumed', 'discarded'] as LeftoverStatus[]) {
      await closeLeftover(r.id, status as 'consumed' | 'discarded', db)
      expect(await db.leftovers.get(r.id)).toMatchObject({ status, closedAt: expect.any(String) })
      await reopenLeftover(r.id, db)
      expect(await db.leftovers.get(r.id)).toMatchObject({ status: 'available', closedAt: null })
    }
    await deleteLeftover(r.id, db)
    expect(await db.leftovers.get(r.id)).toBeUndefined()
  })

  it('n’accepte qu’un ingrédient « cuisiné » comme correspondance d’un reste', async () => {
    const db = freshDb()
    const raw = await addLeftover(leftoverInput({ name: 'Riz', ingredientId: 'riz' }), db)
    expect(raw.ingredientId).toBeNull()
    const cooked = await addLeftover(leftoverInput({ name: 'Riz', ingredientId: 'riz-cuit' }), db)
    expect(cooked.ingredientId).toBe('riz-cuit')
  })

  it('sauvegarde et restaure les restes et l’historique', async () => {
    const db = freshDb()
    await addLeftover(leftoverInput(), db)
    const eggs = await addItem(item({}), db)
    await recordPreparation(prep({ uses: [use(eggs.id)] }), db)
    const { json } = await exportBackup(db)
    const other = freshDb()
    await restoreBackup(readBackup(json), other)
    expect(await other.leftovers.count()).toBe(1)
    expect(await other.preparations.count()).toBe(1)
  })
})

describe('migration de la base v2 → v3', () => {
  it('déplace les « restes cuisinés » vers les restes et préserve tout le reste', async () => {
    const name = `p3-migration-${++counter}`
    const v2 = new Dexie(name)
    v2.version(1).stores({ pantry: 'id, ingredientId, expiresOn, location, updatedAt' })
    v2.version(2).stores({ pantry: 'id, ingredientId, category, updatedAt', favorites: 'recipeId, savedAt', settings: 'key' })
    const base = {
      category: 'starch',
      location: 'fridge',
      purchasedOn: null,
      dateLabel: null,
      urgent: false,
      source: 'manual',
      confirmed: true,
      linkConfirmed: true,
      createdAt: '2026-03-28T10:00:00.000Z',
      updatedAt: '2026-03-28T10:00:00.000Z',
    }
    await v2.table('pantry').bulkAdd([
      { ...base, id: 'raw-rice', name: 'Riz basmati', ingredientId: 'riz', quantity: 1, unit: 'kg', status: 'unopened', openedOn: null },
      { ...base, id: 'old-rice', name: 'Reste de riz', ingredientId: 'riz', quantity: 150, unit: 'g', status: 'leftover', openedOn: '2026-03-29' },
      // Enregistrement incomplet : ne doit ni bloquer la migration, ni être perdu.
      { id: 'broken', name: 'Reste bizarre', status: 'leftover' },
    ])
    await v2.table('favorites').add({ recipeId: 'pain-perdu', savedAt: 's' })
    await v2.table('settings').add({ key: 'staples', value: ['sel'] })
    v2.close()

    const db = freshDb(name)
    expect((await db.pantry.toArray()).map((i) => i.id).sort()).toEqual(['broken', 'raw-rice'])
    expect(await db.leftovers.toArray()).toEqual([
      expect.objectContaining({ id: 'old-rice', name: 'Reste de riz', ingredientId: 'riz-cuit', quantity: 150, unit: 'g', preparedOn: '2026-03-29' }),
    ])
    expect(await db.favorites.toArray()).toEqual([{ recipeId: 'pain-perdu', savedAt: 's' }])
    expect(await db.settings.get('staples')).toEqual({ key: 'staples', value: ['sel'] })
  })
})
