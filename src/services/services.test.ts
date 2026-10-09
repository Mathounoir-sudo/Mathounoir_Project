import { afterEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { MijoteDB } from '../lib/db'
import type { InventoryInput } from '../domain/types'
import { UserFacingError } from '../lib/errors'
import {
  addItem,
  clearInventory,
  deleteItem,
  getAllItems,
  getItem,
  loadDemoInventory,
  removeDemoInventory,
  stepQuantity,
  updateItem,
} from './inventory'
import { getServings, getStaples, setServings, toggleStaple } from './preferences'
import { findRecipe, getFavorites, RECIPE_CATALOG, toggleFavorite, validateRecipes } from './recipes'
import { exportBackup, readBackup, restoreBackup } from './backup'

const opened: MijoteDB[] = []
let counter = 0
function freshDb(name = `test-${++counter}`) {
  const d = new MijoteDB(name)
  opened.push(d)
  return d
}
afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
})

const input = (overrides: Partial<InventoryInput> = {}): InventoryInput => ({
  name: 'Tomates cerises',
  ingredientId: 'tomate',
  category: 'vegetable',
  quantity: 250,
  unit: 'g',
  location: 'fridge',
  status: 'unopened',
  purchasedOn: null,
  openedOn: null,
  dateLabel: null,
  urgent: false,
  ...overrides,
})

describe('inventaire', () => {
  it('ajoute un ingrédient avec le lien vers le catalogue validé dans le formulaire', async () => {
    const db = freshDb()
    const item = await addItem(input({ name: '  Tomates cerises ' }), db)
    expect(item).toMatchObject({ name: 'Tomates cerises', ingredientId: 'tomate', source: 'manual', confirmed: true, linkConfirmed: true })
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await getAllItems(db)).toHaveLength(1)
  })

  it('modifie un ingrédient (nom, catégorie, quantité, unité, état)', async () => {
    const db = freshDb()
    const item = await addItem(input(), db)
    await updateItem(item.id, input({ name: 'Courgette', ingredientId: 'courgette', quantity: 2, unit: 'unité', status: 'opened' }), db)
    expect(await getItem(item.id, db)).toMatchObject({ name: 'Courgette', ingredientId: 'courgette', quantity: 2, unit: 'unité', status: 'opened' })
  })

  it('signale clairement la modification d’un ingrédient supprimé', async () => {
    const db = freshDb()
    await expect(updateItem('inconnu', input(), db)).rejects.toThrow(/n’existe plus/)
  })

  it('supprime un ingrédient', async () => {
    const db = freshDb()
    const item = await addItem(input(), db)
    await deleteItem(item.id, db)
    expect(await getAllItems(db)).toEqual([])
  })

  it('augmente et diminue la quantité sans passer sous zéro', async () => {
    const db = freshDb()
    const item = await addItem(input({ quantity: 60, unit: 'g' }), db)
    expect(await stepQuantity(item.id, 1, db)).toBe(110)
    expect(await stepQuantity(item.id, -1, db)).toBe(60)
    expect(await stepQuantity(item.id, -1, db)).toBe(10)
    expect(await stepQuantity(item.id, -1, db)).toBe(0)
    expect((await getItem(item.id, db))?.quantity).toBe(0)
  })

  it('conserve les données après fermeture et réouverture (persistance locale)', async () => {
    const name = `persist-${++counter}`
    const first = new MijoteDB(name)
    await addItem(input({ name: 'Lait' }), first)
    first.close()
    const second = freshDb(name)
    expect((await getAllItems(second)).map((i) => i.name)).toEqual(['Lait'])
  })

  it('charge puis retire uniquement les données de démonstration', async () => {
    const db = freshDb()
    await addItem(input({ name: 'Mon fromage' }), db)
    const n = await loadDemoInventory(db, '2026-03-30')
    expect(n).toBeGreaterThan(5)
    expect(await getAllItems(db)).toHaveLength(n + 1)
    await removeDemoInventory(db)
    expect((await getAllItems(db)).map((i) => i.name)).toEqual(['Mon fromage'])
  })

  it('vide l’inventaire', async () => {
    const db = freshDb()
    await loadDemoInventory(db)
    await clearInventory(db)
    expect(await getAllItems(db)).toEqual([])
  })

  it('transforme les erreurs techniques en messages compréhensibles', async () => {
    const db = freshDb()
    db.close()
    await db.delete()
    const broken = Object.assign(Object.create(MijoteDB.prototype), { pantry: { add: () => Promise.reject(new DOMException('', 'QuotaExceededError')) } })
    await expect(addItem(input(), broken)).rejects.toBeInstanceOf(UserFacingError)
    await expect(addItem(input(), broken)).rejects.toThrow(/stockage de l’appareil est plein/)
  })
})

describe('migration de la base v1 → v2', () => {
  it('convertit les produits existants sans rien inventer', async () => {
    const name = `migration-${++counter}`
    const v1 = new Dexie(name)
    v1.version(1).stores({ pantry: 'id, ingredientId, expiresOn, location, updatedAt' })
    await v1.table('pantry').add({
      id: 'old',
      name: 'Lait',
      ingredientId: 'lait',
      quantity: 1,
      unit: 'pièce',
      location: 'frigo',
      expiresOn: '2026-04-01',
      createdAt: 'c',
      updatedAt: 'u',
    })
    v1.close()

    const db = freshDb(name)
    expect(await getItem('old', db)).toMatchObject({
      category: 'dairy',
      unit: 'unité',
      location: 'fridge',
      status: 'unopened',
      dateLabel: { kind: 'unspecified', date: '2026-04-01' },
      urgent: false,
    })
  })
})

describe('basiques et favoris', () => {
  it('active et désactive un basique', async () => {
    const db = freshDb()
    expect(await getStaples(db)).toEqual([])
    await toggleStaple('sel', db)
    await toggleStaple('huile', db)
    expect(await getStaples(db)).toEqual(['huile', 'sel'])
    await toggleStaple('sel', db)
    expect(await getStaples(db)).toEqual(['huile'])
  })

  it('mémorise le nombre de portions et ignore une valeur enregistrée invalide', async () => {
    const name = `servings-${++counter}`
    const db = new MijoteDB(name)
    expect(await getServings(db)).toBe(1)
    await setServings(2, db)
    db.close()
    const reopened = freshDb(name)
    expect(await getServings(reopened)).toBe(2)
    await reopened.settings.put({ key: 'servings', value: 'beaucoup' })
    expect(await getServings(reopened)).toBe(1)
  })

  it('les favoris survivent à la réouverture ; un favori inconnu est ignoré sans erreur', async () => {
    const name = `fav-${++counter}`
    const db = new MijoteDB(name)
    await toggleFavorite('pain-perdu', db)
    await db.favorites.put({ recipeId: 'recette-supprimee', savedAt: '2026-01-01T00:00:00.000Z' })
    db.close()
    const reopened = freshDb(name)
    const ids = await getFavorites(reopened)
    expect(ids).toContain('pain-perdu')
    expect(ids.map(findRecipe).filter(Boolean).map((r) => r!.id)).toEqual(['pain-perdu'])
  })

  it('enregistre et retire une recette favorite', async () => {
    const db = freshDb()
    expect(await toggleFavorite('pain-perdu', db)).toBe(true)
    expect(await getFavorites(db)).toEqual(['pain-perdu'])
    expect(await toggleFavorite('pain-perdu', db)).toBe(false)
    expect(await getFavorites(db)).toEqual([])
  })
})

describe('recettes', () => {
  it('toutes les recettes de démonstration sont valides', () => {
    expect(RECIPE_CATALOG.rejected).toEqual([])
    expect(RECIPE_CATALOG.recipes.length).toBeGreaterThanOrEqual(10)
  })
  it('écarte une recette malformée sans faire planter les autres', () => {
    const valid = RECIPE_CATALOG.recipes[0]
    const result = validateRecipes([valid, { id: 'cassée', title: '' }, null])
    expect(result.recipes).toEqual([valid])
    expect(result.rejected.map((r) => r.index)).toEqual([1, 2])
  })
})

describe('sauvegarde', () => {
  it('exporte puis restaure inventaire, basiques et favoris', async () => {
    const db = freshDb()
    await addItem(input({ name: 'Riz' }), db)
    await toggleStaple('sel', db)
    await toggleFavorite('riz-saute', db)
    const { json, count } = await exportBackup(db)
    expect(count).toBe(1)

    const other = freshDb()
    await addItem(input({ name: 'À remplacer' }), other)
    await restoreBackup(readBackup(json), other)
    expect((await getAllItems(other)).map((i) => i.name)).toEqual(['Riz'])
    expect(await getStaples(other)).toEqual(['sel'])
    expect(await getFavorites(other)).toEqual(['riz-saute'])
  })
})

describe('messages d’erreur', () => {
  it('élide correctement « de » devant une voyelle', async () => {
    const { describeStorageError } = await import('../lib/errors')
    expect(describeStorageError(new Error('x'), 'ajouter l’ingrédient').message).toMatch(/^Impossible d’ajouter/)
    expect(describeStorageError(new Error('x'), 'lire l’inventaire').message).toMatch(/^Impossible de lire/)
  })
})
