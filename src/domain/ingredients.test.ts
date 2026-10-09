import { describe, expect, it } from 'vitest'
import { buildMatchers, linkIngredient, resolveLink, searchCatalog } from './ingredients'
import { CATALOG } from '../data/catalog'

const matchers = buildMatchers(CATALOG)
const link = (label: string) => linkIngredient(label, matchers)

describe('correspondance exacte (nom ou synonyme explicite)', () => {
  it.each([
    ['Tomates', 'tomate'],
    ['Pommes de terre', 'pomme-de-terre'],
    ['Pommes', 'pomme'],
    ['6 œufs', 'oeuf'],
    ['Riz', 'riz'],
    ['Reste de riz', 'riz-cuit'],
    ['Riz cuit', 'riz-cuit'],
    ['Légumes rôtis', 'legumes-cuits'],
    ['Lait de coco', 'lait-coco'],
    ['Spaghetti', 'pates'],
    ['Emmental', 'fromage-rape'],
    ['Chou-fleur', 'chou-fleur'],
    ['Persil', 'herbes'],
    ['Crème fraîche', 'creme'],
  ])('« %s » → %s', (label, expected) => {
    expect(link(label)).toEqual({ ingredientId: expected, certainty: 'exact' })
  })
})

describe('correspondance probable (à confirmer)', () => {
  it.each([
    ['Tomates cerises', 'tomate'],
    ['Lait demi-écrémé', 'lait'],
    ['Pommes de terre nouvelles', 'pomme-de-terre'],
    ['Pâte feuilletée maison', 'pate-a-tarte'],
  ])('« %s » → %s, seulement probable', (label, expected) => {
    expect(link(label)).toEqual({ ingredientId: expected, certainty: 'probable' })
  })
})

describe('ingrédients non équivalents', () => {
  it.each([
    // Le nom contient « poulet », mais c'est un bouillon : jamais relié au poulet.
    ['Bouillon de poulet', { ingredientId: 'bouillon', certainty: 'probable' }],
    ['Yaourt à la fraise', { ingredientId: 'yaourt', certainty: 'probable' }],
    // Contient un mot connu sans commencer par lui : aucun lien.
    ['Jus de citron', null],
    ['Chips au fromage', null],
    ['Tofu fumé', null],
    ['   ', null],
  ])('« %s » → %o', (label, expected) => {
    expect(link(label)).toEqual(expected)
  })
})

describe('resolveLink', () => {
  it('respecte le choix confirmé par l’utilisateur, y compris « aucun »', () => {
    expect(resolveLink({ name: 'Tomates cerises', ingredientId: 'tomate', linkConfirmed: true }, matchers)).toEqual({
      ingredientId: 'tomate',
      certainty: 'confirmed',
    })
    expect(resolveLink({ name: 'Lait', ingredientId: null, linkConfirmed: true }, matchers)).toBeNull()
  })
  it('recalcule le lien d’un produit non confirmé à partir de son nom', () => {
    expect(resolveLink({ name: 'Bouillon de poulet', ingredientId: 'poulet', linkConfirmed: false }, matchers)?.ingredientId).toBe('bouillon')
  })
})

describe('searchCatalog', () => {
  it('trouve par début de mot, sans accents', () => {
    expect(searchCatalog('epi', CATALOG).map((i) => i.id)).toContain('epinard')
    expect(searchCatalog('terre', CATALOG).map((i) => i.id)).toContain('pomme-de-terre')
  })
  it('passe aussi par les synonymes', () => {
    expect(searchCatalog('emmental', CATALOG).map((i) => i.id)).toEqual(['fromage-rape'])
  })
  it('ne renvoie rien pour une recherche vide', () => {
    expect(searchCatalog('  ', CATALOG)).toEqual([])
  })
})

describe('catalogue', () => {
  it('les identifiants sont uniques', () => {
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(CATALOG.length)
  })
})
