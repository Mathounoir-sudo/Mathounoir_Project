import { afterEach, describe, expect, it } from 'vitest'
import { addPantryItem, deletePantryItem, getAllPantry, MijoteDB, replacePantry, updatePantryItem } from './db'

let database: MijoteDB

afterEach(async () => {
  await database.delete()
})

describe('base locale', () => {
  it('ajoute, modifie et supprime un produit', async () => {
    database = new MijoteDB('test-crud')
    const added = await addPantryItem(
      { name: ' Tomates cerises ', quantity: 250, unit: 'g', location: 'frigo', expiresOn: '2026-04-01' },
      database,
    )
    expect(added.name).toBe('Tomates cerises')
    expect(added.ingredientId).toBe('tomate')
    expect(added.id).toMatch(/^[0-9a-f-]{36}$/)

    await updatePantryItem(added.id, { ...added, name: 'Courgettes' }, database)
    const [updated] = await getAllPantry(database)
    expect(updated?.ingredientId).toBe('courgette')

    await deletePantryItem(added.id, database)
    expect(await getAllPantry(database)).toEqual([])
  })

  it('remplace tout le garde-manger lors d’une restauration', async () => {
    database = new MijoteDB('test-replace')
    await addPantryItem({ name: 'Lait', quantity: 1, unit: 'l', location: 'frigo', expiresOn: null }, database)
    const item = await addPantryItem({ name: 'Riz', quantity: null, unit: 'g', location: 'placard', expiresOn: null }, database)
    await replacePantry([item], database)
    expect((await getAllPantry(database)).map((i) => i.name)).toEqual(['Riz'])
  })
})
