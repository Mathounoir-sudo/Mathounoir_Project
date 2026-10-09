export type Unit = 'pièce' | 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'c. à s.' | 'c. à c.' | 'pincée' | 'tranche' | 'boîte'

export const UNITS: Unit[] = ['pièce', 'g', 'kg', 'ml', 'cl', 'l', 'c. à s.', 'c. à c.', 'pincée', 'tranche', 'boîte']

export type Location = 'frigo' | 'placard' | 'congélateur'

export const LOCATIONS: Location[] = ['frigo', 'placard', 'congélateur']

export type IngredientCategory =
  | 'légume'
  | 'fruit'
  | 'féculent'
  | 'produit laitier'
  | 'œuf'
  | 'viande-poisson'
  | 'légumineuse'
  | 'épicerie'
  | 'base'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  /** Autres façons courantes de l'écrire (sans accents ni pluriel nécessaires). */
  aliases?: string[]
}

/** Un produit présent chez l'utilisateur. */
export interface PantryItem {
  /** UUID : permettra une future synchronisation entre appareils. */
  id: string
  /** Libellé saisi par l'utilisateur, ex. « Tomates cerises ». */
  name: string
  /** Ingrédient du catalogue reconnu à partir du libellé, s'il y en a un. */
  ingredientId: string | null
  quantity: number | null
  unit: Unit
  location: Location
  /** Date limite au format AAAA-MM-JJ, ou null si inconnue. */
  expiresOn: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipeIngredient {
  ingredientId: string
  quantity?: number
  unit?: Unit
  /** Ingrédient facultatif : n'empêche pas de cuisiner la recette. */
  optional?: boolean
}

export interface Recipe {
  id: string
  title: string
  summary: string
  servings: number
  minutes: number
  ingredients: RecipeIngredient[]
  steps: string[]
  tags: string[]
}
