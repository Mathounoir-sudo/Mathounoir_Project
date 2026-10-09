import type { CatalogIngredient, InventoryItem } from './types'
import { normalizeSingular } from './text'

interface Matcher {
  ingredientId: string
  words: string[]
}

/**
 * Certitude du lien entre un produit de l'inventaire et un ingrédient du catalogue :
 * - confirmed : choisi par l'utilisateur ;
 * - exact : le nom correspond exactement au nom ou à un synonyme explicite du catalogue ;
 * - probable : le nom COMMENCE par un ingrédient connu (« Tomates cerises » → tomate) — à confirmer.
 * Un nom qui contient seulement un mot connu (« Bouillon de poulet », « Jus de citron »)
 * n'est jamais relié automatiquement : des noms proches ne sont pas forcément le même ingrédient.
 */
export type LinkCertainty = 'confirmed' | 'exact' | 'probable'

export interface IngredientLink {
  ingredientId: string
  certainty: LinkCertainty
}

export function buildMatchers(catalog: CatalogIngredient[]): Matcher[] {
  const matchers: Matcher[] = []
  for (const ing of catalog) {
    for (const label of [ing.name, ...(ing.aliases ?? [])]) {
      const words = labelWords(label)
      if (words.length > 0) matchers.push({ ingredientId: ing.id, words })
    }
  }
  // Les libellés les plus longs d'abord : « pomme de terre » doit gagner sur « pomme ».
  return matchers.sort((a, b) => b.words.length - a.words.length)
}

/** Mots normalisés d'un libellé, sans les nombres en tête (« 6 œufs » → « oeuf »). */
function labelWords(label: string): string[] {
  const words = normalizeSingular(label).split(' ').filter(Boolean)
  while (words.length > 0 && /^\d+$/.test(words[0]!)) words.shift()
  return words
}

const startsWith = (words: string[], prefix: string[]) => prefix.every((w, i) => words[i] === w)

/** Relie un libellé libre au catalogue, avec son niveau de certitude ; null si rien de sûr ni de probable. */
export function linkIngredient(label: string, matchers: Matcher[]): IngredientLink | null {
  const words = labelWords(label)
  if (words.length === 0) return null
  const exact = matchers.find((m) => m.words.length === words.length && startsWith(words, m.words))
  if (exact) return { ingredientId: exact.ingredientId, certainty: 'exact' }
  const probable = matchers.find((m) => m.words.length < words.length && startsWith(words, m.words))
  return probable ? { ingredientId: probable.ingredientId, certainty: 'probable' } : null
}

/** Lien d'un produit de l'inventaire : celui confirmé par l'utilisateur, sinon celui déduit du nom. */
export function resolveLink(item: Pick<InventoryItem, 'name' | 'ingredientId' | 'linkConfirmed'>, matchers: Matcher[]): IngredientLink | null {
  if (item.linkConfirmed) return item.ingredientId ? { ingredientId: item.ingredientId, certainty: 'confirmed' } : null
  return linkIngredient(item.name, matchers)
}

/** Recherche dans le catalogue pour l'autocomplétion (début de mot, sans accents). */
export function searchCatalog(query: string, catalog: CatalogIngredient[], limit = 6): CatalogIngredient[] {
  const q = normalizeSingular(query)
  if (!q) return []
  const scored: { ing: CatalogIngredient; rank: number }[] = []
  for (const ing of catalog) {
    const labels = [ing.name, ...(ing.aliases ?? [])].map(normalizeSingular)
    if (labels.some((l) => l.startsWith(q))) scored.push({ ing, rank: 0 })
    else if (labels.some((l) => l.split(' ').some((w) => w.startsWith(q)))) scored.push({ ing, rank: 1 })
  }
  return scored
    .sort((a, b) => a.rank - b.rank || a.ing.name.localeCompare(b.ing.name, 'fr'))
    .slice(0, limit)
    .map((s) => s.ing)
}
