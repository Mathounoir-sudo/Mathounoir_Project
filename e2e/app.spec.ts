import { expect, test, type Page } from '@playwright/test'

const nav = (page: Page, name: string) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name })

async function addIngredient(page: Page, name: string, fill?: (page: Page) => Promise<void>) {
  await page.goto('/#/inventaire/nouveau')
  await page.getByLabel('Nom').fill(name)
  await fill?.(page)
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mon inventaire' })).toBeVisible()
}

test('parcours 1 : ajouter des ingrédients à la main puis trouver une recette', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Votre inventaire est vide')).toBeVisible()
  await page.getByRole('link', { name: 'Ajouter un ingrédient' }).click()

  // Recherche dans le catalogue : la catégorie est proposée automatiquement.
  await page.getByLabel('Nom').fill('œuf')
  await page.getByRole('option').getByRole('button', { name: /Œuf/ }).click()
  await expect(page.getByLabel('Catégorie')).toHaveValue('egg')
  await expect(page.getByText(/Reconnu : Œuf/)).toBeVisible()
  await page.getByLabel(/Quantité/).fill('6')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('« Œuf » ajouté à l’inventaire.')).toBeVisible()

  // Basique confirmé explicitement : jamais supposé.
  await page.getByRole('button', { name: 'Sel' }).click()
  await expect(page.getByRole('button', { name: 'Sel' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Huile' }).click()

  await nav(page, 'Accueil').click()
  await expect(page.getByText('1 ingrédient', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Trouver une recette' }).click()
  await expect(page.getByRole('heading', { name: 'Mes recettes' })).toBeVisible()

  await page.getByRole('switch', { name: /Uniquement avec ce que j’ai/ }).check({ force: true })
  const omelette = page.getByRole('link', { name: /Omelette vide-frigo/ })
  await expect(omelette).toContainText('Rien à acheter')
  await expect(page.getByRole('link', { name: /Pain perdu/ })).toHaveCount(0)

  await omelette.click()
  await expect(page.getByRole('heading', { name: 'Omelette vide-frigo' })).toBeVisible()
  await expect(page.getByText('Vous avez tous les ingrédients nécessaires.')).toBeVisible()
  await expect(page.getByText('Préparation', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('3 unités')).toBeVisible()
  await expect(page.getByText(/Étape 1/)).toBeAttached()
})

test('validation : messages d’erreur compréhensibles', async ({ page }) => {
  await page.goto('/#/inventaire/nouveau')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText('Indiquez le nom de l’ingrédient.')).toBeVisible()
  await expect(page.getByLabel('Nom')).toBeFocused()

  await page.getByLabel('Nom').fill('Lait')
  await page.getByLabel(/Quantité/).fill('beaucoup')
  await page.getByLabel('Type de date').selectOption('use-by')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText(/Saisissez un nombre positif/)).toBeVisible()
  await expect(page.getByText('Indiquez la date figurant sur l’emballage.')).toBeVisible()
  await expect(page.getByText('Certains champs sont à corriger avant d’enregistrer.')).toBeVisible()
})

test('modifier, ajuster la quantité puis supprimer un ingrédient', async ({ page }) => {
  await addIngredient(page, 'Riz', async (p) => {
    await p.getByLabel(/Quantité/).fill('500')
    await p.getByLabel('Unité').selectOption('g')
  })
  await page.getByRole('button', { name: 'Ajouter 50 g à Riz' }).click()
  await expect(page.getByRole('group', { name: 'Quantité de Riz' })).toContainText('550 g')
  await page.getByRole('button', { name: 'Retirer 50 g de Riz' }).click()
  await page.getByRole('button', { name: 'Retirer 50 g de Riz' }).click()
  await expect(page.getByRole('group', { name: 'Quantité de Riz' })).toContainText('450 g')

  await page.getByRole('link', { name: 'Modifier Riz' }).click()
  await page.getByLabel('Nom').fill('Riz basmati')
  await page.getByRole('button', { name: 'Entamé', exact: true }).click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('link', { name: 'Modifier Riz basmati' })).toContainText('Entamé')

  await page.getByRole('link', { name: 'Modifier Riz basmati' }).click()
  await page.getByRole('button', { name: 'Supprimer cet ingrédient' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText('« Riz basmati » supprimé.')).toBeVisible()
  await expect(page.getByText('Aucun ingrédient pour l’instant')).toBeVisible()
})

test('parcours 4 : les données persistent après rechargement', async ({ page }) => {
  await addIngredient(page, 'Courgettes', async (p) => {
    await p.getByLabel(/Quantité/).fill('2')
    await p.getByLabel('Type de date').selectOption('best-before')
    await p.getByLabel('Date indiquée').fill('2099-01-01')
  })
  await page.getByRole('button', { name: 'Ajouter 1 unité à Courgettes' }).click()
  await page.reload()
  await expect(page.getByText('Courgettes')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quantité de Courgettes' })).toContainText('3 unités')
  await expect(page.getByText(/DDM le 1 janvier 2099/)).toBeVisible()
})

test('parcours 6 : sans clé d’IA, le scan l’explique et propose la saisie manuelle', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Scanner mon frigo' }).click()
  await expect(page.getByText('Reconnaissance photo pas encore disponible')).toBeVisible()
  await page.getByRole('link', { name: 'Ajouter mes ingrédients à la main' }).click()
  await expect(page.getByRole('heading', { name: 'Ajouter un ingrédient' })).toBeVisible()
  await nav(page, 'Réglages').click()
  await expect(page.getByText('Reconnaissance photo :')).toBeVisible()
  await expect(page.getByText('non configurée', { exact: true })).toBeVisible()
})

test('données de démo : priorités, sécurité, recettes enregistrées', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Essayer avec la démo' }).click()
  await expect(page.getByText(/ingrédients fictifs ajoutés/)).toBeVisible()

  // Produit à DLC dépassée : signalé, jamais proposé.
  await expect(page.getByRole('heading', { name: 'À vérifier' })).toBeVisible()
  await expect(page.getByText(/Crème fraîche/)).toBeVisible()
  await expect(page.getByText(/DLC dépassée le .* ne pas consommer/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'À utiliser en priorité' })).toBeVisible()

  await nav(page, 'Recettes').click()
  await page.getByRole('link', { name: /Pain perdu/ }).click()
  await expect(page.getByText('4 tranches')).toBeVisible()
  await expect(page.getByText('Cuisson', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByRole('button', { name: 'Enregistrée' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await nav(page, 'Accueil').click()
  await expect(page.getByRole('heading', { name: 'Mes recettes enregistrées' })).toBeVisible()

  await nav(page, 'Réglages').click()
  await page.getByRole('button', { name: /Retirer les \d+ ingrédients de démo/ }).click()
  await nav(page, 'Accueil').click()
  await expect(page.getByText('Votre inventaire est vide')).toBeVisible()
})

test('exporter puis restaurer une sauvegarde', async ({ page }) => {
  await addIngredient(page, 'Lait')
  await nav(page, 'Réglages').click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click()
  const path = await (await download).path()

  await page.getByRole('button', { name: 'Effacer toutes mes données' }).click()
  await page.getByRole('button', { name: 'Tout effacer' }).click()
  await expect(page.getByText(/ont été effacées/)).toBeVisible()

  await page.getByTestId('import-input').setInputFiles(path)
  await page.getByRole('button', { name: 'Remplacer' }).click()
  await expect(page.getByText(/Sauvegarde restaurée : 1/)).toBeVisible()
  await nav(page, 'Inventaire').click()
  await expect(page.getByRole('link', { name: 'Modifier Lait' })).toBeVisible()
})

test('refuse un fichier de sauvegarde invalide sans toucher aux données', async ({ page }) => {
  await addIngredient(page, 'Beurre')
  await nav(page, 'Réglages').click()
  await page.getByTestId('import-input').setInputFiles({ name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from('{"oops":true}') })
  await expect(page.getByText("Ce fichier n'est pas une sauvegarde Mijoté.")).toBeVisible()
  await nav(page, 'Inventaire').click()
  await expect(page.getByRole('link', { name: 'Modifier Beurre' })).toBeVisible()
})

test('installable et utilisable hors connexion', async ({ page, context }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifest = await (await page.request.get(href!)).json()
  expect(manifest.short_name).toBe('Mijoté')
  expect(manifest.lang).toBe('fr')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Cuisinez quelque chose de bon avec ce que vous avez déjà.')).toBeVisible()
  await context.setOffline(false)
})
