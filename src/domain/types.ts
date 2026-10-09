/**
 * Modèle de données de Mijoté.
 * Les valeurs internes sont des codes stables (en anglais) ; les libellés affichés
 * sont dans src/i18n/fr.ts, ce qui permettra d'ajouter d'autres langues.
 */

export const UNITS = [
  'unité',
  'g',
  'kg',
  'ml',
  'cl',
  'l',
  'portion',
  'tranche',
  'c. à s.',
  'c. à c.',
  'pincée',
  'boîte',
  'sachet',
  'botte',
] as const
export type Unit = (typeof UNITS)[number]

export const CATEGORIES = [
  'vegetable',
  'fruit',
  'dairy',
  'egg',
  'meat-fish',
  'starch',
  'legume',
  'grocery',
  'staple',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const LOCATIONS = ['fridge', 'pantry', 'freezer'] as const
export type Location = (typeof LOCATIONS)[number]

/** État du produit, toujours choisi par l'utilisateur. */
export const STATUSES = ['unopened', 'opened', 'leftover', 'frozen'] as const
export type Status = (typeof STATUSES)[number]

/**
 * Type de date imprimée sur l'emballage :
 * - use-by : DLC, « à consommer jusqu'au » — ne plus consommer après ;
 * - best-before : DDM, « à consommer de préférence avant » — qualité, pas sécurité ;
 * - unspecified : l'utilisateur ne sait pas (on reste prudent).
 */
export const DATE_KINDS = ['use-by', 'best-before', 'unspecified'] as const
export type DateKind = (typeof DATE_KINDS)[number]

export interface DateLabel {
  kind: DateKind
  /** AAAA-MM-JJ */
  date: string
}

/** Origine d'un ingrédient : saisie manuelle ou données de démonstration (plus tard : photo). */
export type Source = 'manual' | 'demo'

export interface InventoryItem {
  /** UUID stable : permettra une future synchronisation entre appareils. */
  id: string
  name: string
  /** Ingrédient du catalogue reconnu (sert aux suggestions de recettes), ou null. */
  ingredientId: string | null
  category: Category
  /** null = quantité inconnue. */
  quantity: number | null
  unit: Unit
  location: Location | null
  status: Status
  purchasedOn: string | null
  openedOn: string | null
  /** Date confirmée par l'utilisateur ; jamais devinée par l'application. */
  dateLabel: DateLabel | null
  /** L'utilisateur a indiqué vouloir l'utiliser en priorité. */
  urgent: boolean
  source: Source
  /** false pour une donnée proposée automatiquement et pas encore vérifiée (future reconnaissance photo). */
  confirmed: boolean
  /**
   * true si l'utilisateur a validé l'ingrédient du catalogue correspondant (`ingredientId`, ou aucun).
   * Sinon, le lien est recalculé à partir du nom et peut n'être que « probable ».
   */
  linkConfirmed: boolean
  createdAt: string
  updatedAt: string
}

/** Champs modifiables par l'utilisateur dans le formulaire. */
export type InventoryInput = Pick<
  InventoryItem,
  'name' | 'ingredientId' | 'category' | 'quantity' | 'unit' | 'location' | 'status' | 'purchasedOn' | 'openedOn' | 'dateLabel' | 'urgent'
>

export interface CatalogIngredient {
  id: string
  name: string
  category: Category
  /** Autres façons courantes de l'écrire. */
  aliases?: string[]
  defaultUnit?: Unit
}

export interface RecipeIngredient {
  ingredientId: string
  /** null = « selon le goût » (sel, poivre…). */
  quantity: number | null
  unit: Unit | null
  optional?: boolean
  /** Précision libre, ex. « rassis », « cuit la veille ». */
  note?: string
}

export const HEATS = ['feu doux', 'feu moyen', 'feu vif'] as const
export type Heat = (typeof HEATS)[number]

export interface RecipeStep {
  text: string
  /** Niveau de feu, quand l'étape se fait sur la plaque. */
  heat?: Heat
  /** Température du four en °C, quand l'étape se fait au four. */
  ovenC?: number
}

/**
 * Remplacement structuré : si l'ingrédient `replaces` manque, la recette reste faisable
 * avec les ingrédients `use` (quantités pour le nombre de portions de base de la recette).
 */
export interface Substitution {
  replaces: string
  use: RecipeIngredient[]
  note?: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  /** Famille de plat, pour varier les suggestions (ex. « omelette », « soupe », « gâteau »). */
  family: string
  servings: number
  /** false si les quantités ne doivent pas être recalculées (gâteau dans un moule, par exemple). */
  scalable: boolean
  prepMinutes: number
  cookMinutes: number
  ingredients: RecipeIngredient[]
  equipment: string[]
  steps: RecipeStep[]
  substitutions: Substitution[]
  /** Astuces libres (ne sont pas utilisées par le moteur de recettes). */
  tips: string[]
  /** En quoi la recette aide à éviter le gaspillage. */
  antiWaste: string
  /** Conseil de conservation, seulement quand il est fiable. */
  storage: string | null
  safety: string[]
  tags: string[]
}
