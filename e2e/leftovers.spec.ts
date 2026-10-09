import { expect, test, type Page } from '@playwright/test'

const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name })

/** Ajoute un ingrédient brut par le formulaire (quantité vide = inconnue). */
async function addIngredient(page: Page, name: string, quantity: string, unit?: string) {
  await page.goto('/#/inventaire/nouveau')
  await page.getByLabel('Nom').fill(name)
  if (quantity) await page.getByLabel(/Quantité/).fill(quantity)
  if (unit) await page.getByLabel('Unité').selectOption(unit)
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mon inventaire' })).toBeVisible()
}

async function confirmStaples(page: Page, names: string[]) {
  await page.goto('/#/inventaire')
  for (const n of names) {
    await page.getByRole('button', { name: n, exact: true }).click()
    await expect(page.getByRole('button', { name: n, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
}

async function addLeftover(page: Page, name: string, quantity: string, unit: string) {
  await page.goto('/#/inventaire/restes/nouveau')
  await page.getByLabel('Ce que contient ce reste').fill(name)
  await page.getByLabel('Quantité conservée').fill(quantity)
  await page.getByLabel('Unité').selectOption(unit)
  await page.getByRole('button', { name: 'Ajouter le reste' }).click()
  await expect(page.getByRole('list', { name: 'Restes disponibles' })).toBeVisible()
}

const eggsQty = (page: Page) => page.getByRole('group', { name: 'Quantité de Œufs' })

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('parcours complet : préparer une recette, déduire les quantités confirmées, garder les restes', async ({ page }) => {
  await addIngredient(page, 'Œufs', '10')
  await confirmStaples(page, ['Sel', 'Huile'])

  await page.goto('/#/recettes/omelette-vide-frigo')
  await page.getByRole('link', { name: 'Je cuisine cette recette' }).click()
  await expect(page).toHaveURL(/#\/recettes\/omelette-vide-frigo\/preparer\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Je cuisine : Omelette vide-frigo' })).toBeVisible()
  await noHorizontalScroll(page)

  // 2 portions préparées → 6 œufs proposés, modifiables.
  await page.getByRole('button', { name: 'Une portion de plus' }).click()
  const eggs = page.getByRole('list', { name: 'Quantités utilisées' }).getByRole('listitem').filter({ hasText: 'Œufs' })
  await expect(eggs.getByLabel('Quantité utilisée')).toHaveValue('6')
  await eggs.getByLabel('Quantité utilisée').fill('5')

  // 1 portion mangée, 1 gardée.
  await page.getByRole('button', { name: 'Une portion mangée de moins' }).click()
  await expect(page.getByText('Il reste 1 portion sur 2.')).toBeVisible()
  await expect(page.getByLabel('Quantité conservée')).toHaveValue('1')

  // Double clic : une seule déduction.
  await page.getByRole('button', { name: 'Enregistrer la préparation' }).dblclick()
  await expect(page.getByRole('heading', { name: 'Préparation enregistrée' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Quantités déduites' })).toContainText('− 5 unités')

  // Recharger ne déduit rien de plus.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Préparation enregistrée' })).toBeVisible()
  await nav(page, 'Inventaire').click()
  await expect(eggsQty(page)).toContainText('5 unités')

  // Le reste apparaît dans « Mes restes », aussi après rechargement, avec sa recette d'origine.
  await page.getByRole('link', { name: /Mes restes/ }).click()
  await page.reload()
  const card = page.getByRole('list', { name: 'Restes disponibles' }).getByRole('listitem').filter({ hasText: 'Reste : Omelette vide-frigo' })
  await expect(card).toContainText('1 portion')
  await expect(card.getByRole('link', { name: 'Omelette vide-frigo', exact: true })).toBeVisible()
  await noHorizontalScroll(page)
})

test('refuse un stock négatif : rien n’est enregistré', async ({ page }) => {
  await addIngredient(page, 'Œufs', '2')
  await page.goto('/#/recettes/omelette-vide-frigo/preparer')
  const eggs = page.getByRole('list', { name: 'Quantités utilisées' }).getByRole('listitem').filter({ hasText: 'Œufs' })
  await expect(eggs.getByLabel('Quantité utilisée')).toHaveValue('2')
  await eggs.getByLabel('Quantité utilisée').fill('5')
  await page.getByRole('button', { name: 'Enregistrer la préparation' }).click()
  await expect(eggs.getByRole('alert')).toContainText('Vous en avez 2 unités : impossible d’en déduire 5 unités')
  await expect(page.getByRole('heading', { name: 'Préparation enregistrée' })).toHaveCount(0)
  await nav(page, 'Inventaire').click()
  await expect(eggsQty(page)).toContainText('2 unités')
})

test('quantité inconnue : aucune déduction précise possible, choix explicite', async ({ page }) => {
  await addIngredient(page, 'Œufs', '')
  await page.goto('/#/recettes/omelette-vide-frigo/preparer')
  const eggs = page.getByRole('list', { name: 'Quantités utilisées' }).getByRole('listitem').filter({ hasText: 'Œufs' })
  await expect(eggs).toContainText('En stock : quantité inconnue')
  await expect(eggs.getByRole('radio', { name: 'Déduire', exact: true })).toBeDisabled()
  await expect(eggs.getByRole('radio', { name: 'Ne rien déduire' })).toHaveAttribute('aria-checked', 'true')
  await eggs.getByRole('radio', { name: 'Il n’en reste plus' }).click()
  await page.getByRole('button', { name: 'Enregistrer la préparation' }).click()
  await expect(page.getByRole('list', { name: 'Quantités déduites' })).toContainText('il n’en reste plus')
  await nav(page, 'Inventaire').click()
  await expect(eggsQty(page)).toContainText('0 unité')
})

test('gérer ses restes : ajouter, modifier la quantité, mangé, jeté, remettre, supprimer', async ({ page }) => {
  await page.goto('/#/inventaire/restes')
  await expect(page.getByText('Aucun reste pour l’instant')).toBeVisible()
  await addLeftover(page, 'Reste de riz', '200', 'g')
  const card = page.getByRole('list', { name: 'Restes disponibles' }).getByRole('listitem').filter({ hasText: 'Reste de riz' })
  await expect(card).toContainText('Réutilisable comme : riz cuit')
  await expect(card).toContainText('Aucune date limite fixée : Mijoté ne calcule pas de durée de conservation.')

  await card.getByRole('button', { name: 'Ajouter 50 g à Reste de riz' }).click()
  await expect(card.getByRole('group', { name: 'Quantité de Reste de riz' })).toContainText('250 g')
  await page.reload()
  await expect(card.getByRole('group', { name: 'Quantité de Reste de riz' })).toContainText('250 g')

  await card.getByRole('button', { name: 'Mangé' }).click()
  await expect(page.getByText('Aucun reste pour l’instant')).toBeVisible()
  await page.getByText(/Historique : 1 consommé, 0 jeté/).click()
  const history = page.getByRole('list', { name: 'Historique des restes' })
  await history.getByRole('button', { name: 'Remettre dans les restes' }).click()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Jeté' }).click()
  await page.getByText(/Historique : 0 consommé, 1 jeté/).click()
  await history.getByRole('button', { name: 'Supprimer' }).click()
  await history.getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText(/Historique/)).toHaveCount(0)
})

test('une date limite de sécurité dépassée déclenche une alerte factuelle', async ({ page }) => {
  await page.goto('/#/inventaire/restes/nouveau')
  await page.getByLabel('Ce que contient ce reste').fill('Reste de soupe')
  await page.getByLabel('Quantité conservée').fill('2')
  await page.getByLabel('Préparé le').fill('2020-01-01')
  await page.getByLabel('Date limite que vous fixez').selectOption('use-by')
  await page.getByLabel('À consommer avant le').fill('2020-01-03')
  await page.getByRole('button', { name: 'Ajouter le reste' }).click()
  const card = page.getByRole('list', { name: 'Restes disponibles' }).getByRole('listitem').filter({ hasText: 'Reste de soupe' })
  await expect(card.getByRole('alert')).toContainText('La date limite de sécurité que vous avez fixée (3 janvier 2020) est dépassée.')
  await expect(card).toContainText('Ne pas consommer')
  // L'utilisateur décide : les actions restent disponibles.
  await expect(card.getByRole('button', { name: 'Jeté' })).toBeEnabled()
})

test('les recettes tiennent compte des restes sans confondre cru et cuit', async ({ page }) => {
  await addIngredient(page, 'Œufs', '6')
  await addIngredient(page, 'Sauce soja', '20', 'cl')
  await confirmStaples(page, ['Huile'])

  // Riz CRU seulement : le riz sauté demande du riz cuit, il reste à acheter.
  await addIngredient(page, 'Riz', '1', 'kg')
  await page.goto('/#/recettes/riz-saute')
  const riceLine = page.getByRole('list', { name: 'Ingrédients de la recette' }).getByRole('listitem').filter({ hasText: /^Riz cuit/ })
  await expect(riceLine).toContainText('À acheter')

  // Avec un reste de riz cuit : la recette devient faisable et passe en tête.
  await addLeftover(page, 'Reste de riz', '200', 'g')
  await nav(page, 'Recettes').click()
  const first = page.getByRole('link').filter({ hasText: 'Pourquoi cette recette ?' }).first()
  await expect(first).toContainText('Riz sauté aux restes')
  await expect(first).toContainText('Utilise tes restes')
  await expect(first).toContainText('Utilise tes restes : Reste de riz.')

  // Mode strict : toujours proposée (rien ne manque).
  await page.getByRole('switch', { name: /Uniquement avec ce que j’ai/ }).check({ force: true })
  await expect(page.getByRole('link').filter({ hasText: 'Riz sauté aux restes' }).first()).toContainText('Faisable')
})

test('mode strict : un reste insuffisant ne rend pas la recette réalisable', async ({ page }) => {
  await addIngredient(page, 'Œufs', '6')
  await addIngredient(page, 'Sauce soja', '20', 'cl')
  await confirmStaples(page, ['Huile'])
  await addLeftover(page, 'Reste de riz', '50', 'g')
  await nav(page, 'Recettes').click()
  await page.getByRole('switch', { name: /Uniquement avec ce que j’ai/ }).check({ force: true })
  await expect(page.getByRole('link').filter({ hasText: 'Pourquoi cette recette ?' }).filter({ hasText: 'Riz sauté aux restes' })).toHaveCount(0)
  await page.getByText(/écartées? car il faudrait faire des courses/).click()
  await expect(page.getByText(/riz cuit \(il manque 100 g\)/)).toBeVisible()
})

test('les données d’avant la phase 3 sont préservées et les anciens restes déplacés', async ({ page }) => {
  // Une base « v2 » existe déjà dans le navigateur avant le premier chargement de la nouvelle version.
  await page.goto('/favicon.svg')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mijote', 20)
        open.onupgradeneeded = () => {
          const d = open.result
          const pantry = d.createObjectStore('pantry', { keyPath: 'id' })
          pantry.createIndex('ingredientId', 'ingredientId')
          pantry.createIndex('category', 'category')
          pantry.createIndex('updatedAt', 'updatedAt')
          d.createObjectStore('favorites', { keyPath: 'recipeId' }).createIndex('savedAt', 'savedAt')
          d.createObjectStore('settings', { keyPath: 'key' })
        }
        open.onsuccess = () => {
          const tx = open.result.transaction(['pantry', 'favorites', 'settings'], 'readwrite')
          const base = { location: 'fridge', purchasedOn: null, dateLabel: null, urgent: false, source: 'manual', confirmed: true, linkConfirmed: true, createdAt: '2026-03-28T10:00:00.000Z', updatedAt: '2026-03-28T10:00:00.000Z' }
          tx.objectStore('pantry').put({ ...base, id: 'eggs', name: 'Œufs', ingredientId: 'oeuf', category: 'egg', quantity: 6, unit: 'unité', status: 'unopened', openedOn: null })
          tx.objectStore('pantry').put({ ...base, id: 'old-rice', name: 'Reste de riz', ingredientId: 'riz', category: 'starch', quantity: 150, unit: 'g', status: 'leftover', openedOn: '2026-03-29' })
          tx.objectStore('favorites').put({ recipeId: 'pain-perdu', savedAt: '2026-03-28T10:00:00.000Z' })
          tx.objectStore('settings').put({ key: 'staples', value: ['sel'] })
          tx.oncomplete = () => {
            open.result.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )

  await page.goto('/#/inventaire')
  await expect(page.getByRole('link', { name: 'Modifier Œufs' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Modifier Reste de riz' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Sel', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: /Mes restes \(1\)/ }).click()
  await expect(page.getByRole('list', { name: 'Restes disponibles' })).toContainText('Reste de riz')
  await expect(page.getByRole('list', { name: 'Restes disponibles' })).toContainText('Réutilisable comme : riz cuit')
  await nav(page, 'Recettes').click()
  await page.getByRole('radio', { name: 'Enregistrées' }).click()
  await expect(page.getByRole('link').filter({ hasText: 'Pain perdu' })).toBeVisible()
})
