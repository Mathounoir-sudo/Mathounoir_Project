import { describe, expect, it } from 'vitest'
import { buildMatchers, matchIngredient, searchCatalog } from './ingredients'
import { CATALOG } from '../data/catalog'

const matchers = buildMatchers(CATALOG)

describe('matchIngredient', () => {
  it.each([
    ['Tomates cerises', 'tomate'],
    ['Pommes de terre', 'pomme-de-terre'],
    ['Pommes', 'pomme'],
    ['6 œufs bio', 'oeuf'],
    ['Reste de riz', 'riz'],
    ['Lait de coco', 'lait-coco'],
    ['Lait demi-écrémé', 'lait'],
    ['Pâte feuilletée', 'pate-a-tarte'],
    ['Spaghetti', 'pates'],
    ['Emmental râpé', 'fromage-rape'],
    ['Chou-fleur', 'chou-fleur'],
    ['Persil', 'herbes'],
  ])('« %s » → %s', (label, expected) => {
    expect(matchIngredient(label, matchers)).toBe(expected)
  })

  it('renvoie null pour un produit inconnu', () => {
    expect(matchIngredient('Tofu fumé', matchers)).toBeNull()
    expect(matchIngredient('   ', matchers)).toBeNull()
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
