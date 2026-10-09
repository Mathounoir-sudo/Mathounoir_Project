import type { CatalogIngredient } from './types'
import { normalizeSingular } from './text'

interface Matcher {
  ingredientId: string
  words: string[]
}

export function buildMatchers(catalog: CatalogIngredient[]): Matcher[] {
  const matchers: Matcher[] = []
  for (const ing of catalog) {
    for (const label of [ing.name, ...(ing.aliases ?? [])]) {
      const words = normalizeSingular(label).split(' ').filter(Boolean)
      if (words.length > 0) matchers.push({ ingredientId: ing.id, words })
    }
  }
  // Les libellés les plus longs d'abord : « pomme de terre » doit gagner sur « pomme ».
  return matchers.sort((a, b) => b.words.length - a.words.length)
}

function containsSequence(haystack: string[], needle: string[]): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

/**
 * Retrouve l'ingrédient du catalogue correspondant à un libellé libre.
 * « Tomates cerises » → tomate ; « Reste de riz » → riz ; « Pommes de terre » → pomme-de-terre.
 */
export function matchIngredient(label: string, matchers: Matcher[]): string | null {
  const words = normalizeSingular(label).split(' ').filter(Boolean)
  if (words.length === 0) return null
  for (const m of matchers) {
    if (containsSequence(words, m.words)) return m.ingredientId
  }
  return null
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
