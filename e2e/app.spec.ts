import { expect, test } from '@playwright/test'

test('ajouter un produit, le retrouver après rechargement et voir une recette', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Garde-manger' })).toBeVisible()
  await expect(page.getByText('Votre garde-manger est vide.')).toBeVisible()

  await page.getByRole('button', { name: '+ Ajouter' }).click()
  await page.getByLabel('Produit').fill('Bananes bien mûres')
  await expect(page.getByText('Reconnu : Banane')).toBeVisible()
  await page.getByRole('button', { name: "Aujourd'hui" }).click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Bananes bien mûres')).toBeVisible()
  await expect(page.getByText('1 produit à consommer rapidement')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Bananes bien mûres')).toBeVisible()

  await page.getByRole('link', { name: /Recettes/ }).click()
  await expect(page.getByRole('link', { name: /Banana bread/ })).toBeVisible()
  await page.getByRole('link', { name: /Banana bread/ }).click()
  await expect(page.getByRole('heading', { name: 'Banana bread' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Préparation' })).toBeVisible()
})

test('modifier puis supprimer un produit', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Ajouter' }).click()
  await page.getByLabel('Produit').fill('Yaourts')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await page.getByText('Yaourts').click()
  await page.getByLabel('Produit').fill('Yaourts nature')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Yaourts nature')).toBeVisible()

  await page.getByText('Yaourts nature').click()
  await page.getByRole('button', { name: 'Supprimer' }).click()
  await expect(page.getByText('Votre garde-manger est vide.')).toBeVisible()
})

test('exporter puis restaurer une sauvegarde', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Ajouter' }).click()
  await page.getByLabel('Produit').fill('Lait')
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  await page.getByRole('link', { name: /Réglages/ }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click()
  const download = await downloadPromise
  const path = await download.path()

  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Vider le garde-manger' }).click()
  await expect(page.getByText('Garde-manger vidé.')).toBeVisible()

  await page.getByTestId('import-input').setInputFiles(path)
  await expect(page.getByText('1 produit(s) restauré(s).')).toBeVisible()
  await page.getByRole('link', { name: /Garde-manger/ }).click()
  await expect(page.getByText('Lait')).toBeVisible()
})

test('est installable : manifeste et service worker', async ({ page }) => {
  await page.goto('/')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifest = await (await page.request.get(manifestHref!)).json()
  expect(manifest.short_name).toBe('Mijoté')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)

  const swReady = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return Boolean(reg.active)
  })
  expect(swReady).toBe(true)
})

test('fonctionne hors connexion après la première visite', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // la page est maintenant contrôlée par le service worker
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Garde-manger' })).toBeVisible()
  await context.setOffline(false)
})
