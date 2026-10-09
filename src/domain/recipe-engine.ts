/**
 * Moteur de recettes de Mijoté : déterministe, sans service externe ni IA.
 *
 * Il répond à : « que puis-je cuisiner maintenant avec ce que j'ai vraiment, en quantité suffisante ? »
 *
 * Règles (voir aussi le README) :
 * - un produit n'est utilisé que s'il est relié de façon sûre à l'ingrédient (lien confirmé ou nom exact) ;
 *   un lien seulement « probable » rend la ligne « à confirmer » ;
 * - les quantités ne sont comparées qu'après une conversion fiable (masse ↔ masse, volume ↔ volume) ;
 *   sinon, ou si la quantité est inconnue, la ligne est « à confirmer », jamais « suffisante » ;
 * - les basiques (sel, huile…) ne comptent que si l'utilisateur les a confirmés ;
 * - un produit à DLC dépassée, à date de type inconnu dépassée, ou épuisé n'est jamais utilisé ;
 * - les entrées en double sont additionnées, chacune une seule fois.
 */
import type { CatalogIngredient, InventoryItem, Recipe, RecipeIngredient, Unit } from './types'
import { computePriority, type Priority } from './priority'
import { daysUntil, relativeDays, todayISO } from './dates'
import { convert, scaleQuantity } from './units'
import { buildMatchers, resolveLink } from './ingredients'
import { formatQuantity } from './quantity'

// ─── Types ────────────────────────────────────────────────────────────────────

export type LineStatus =
  /** Présent en quantité suffisante (ou basique confirmé par l'utilisateur). */
  | 'available'
  /** Absent, mais un remplacement prévu par la recette est disponible. */
  | 'substituted'
  /** Présent, mais pas assez (quantités comparables). */
  | 'insufficient'
  /** Présent, mais quantité inconnue, unités non comparables ou lien seulement probable. */
  | 'uncertain'
  /** Absent de l'inventaire. */
  | 'missing'

export type Uncertainty = 'quantity-unknown' | 'unit-incompatible' | 'probable-match'

/** Pourquoi un produit relié à l'ingrédient n'est pas utilisé. */
export type UnusableReason = 'use-by-expired' | 'date-to-check' | 'empty'

export interface LineEvaluation {
  ingredientId: string
  name: string
  /** Quantité demandée pour le nombre de portions choisi (null = selon le goût). */
  quantity: number | null
  unit: Unit | null
  optional: boolean
  note?: string
  status: LineStatus
  /** D'où vient la disponibilité : l'inventaire ou un basique confirmé. */
  source: 'inventory' | 'staple' | null
  /** Produits de l'inventaire utilisés pour cette ligne. */
  items: InventoryItem[]
  /** Quantité disponible convertie dans l'unité de la recette, quand elle est calculable. */
  have: number | null
  /** Quantité qui manque, quand elle est calculable sans risque. */
  shortfall: number | null
  uncertainty: Uncertainty[]
  unusable: { item: InventoryItem; reason: UnusableReason }[]
  /** Remplacement utilisé quand l'ingrédient manque. */
  substitution: { note?: string; lines: LineEvaluation[] } | null
}

export type Feasibility =
  /** Tous les ingrédients obligatoires sont disponibles en quantité suffisante. */
  | 'ready'
  /** Rien ne manque à coup sûr, mais certaines quantités ou correspondances sont à confirmer. */
  | 'to-confirm'
  /** Il faut acheter au moins un ingrédient obligatoire. */
  | 'shopping'

export interface RecipeEvaluation {
  recipe: Recipe
  /** Portions effectivement utilisées pour les calculs. */
  servings: number
  /** true si la recette ne s'ajuste pas et garde ses portions d'origine. */
  servingsLocked: boolean
  lines: LineEvaluation[]
  feasibility: Feasibility
  /** Ingrédients obligatoires à acheter : manquants ou en quantité insuffisante. */
  toBuy: LineEvaluation[]
  /** Ingrédients obligatoires dont la quantité ou la correspondance est à confirmer. */
  toConfirm: LineEvaluation[]
  /** Produits de l'inventaire utilisés (chacun une seule fois). */
  usedItems: InventoryItem[]
  /** Produits utilisés qui sont prioritaires (à écouler), avec leur priorité. */
  priorityItems: { item: InventoryItem; priority: Priority }[]
  totalMinutes: number
}

export interface Recommendation {
  evaluation: RecipeEvaluation
  /** Explications courtes, dans l'ordre d'importance. */
  reasons: string[]
}

export interface EngineContext {
  catalog: ReadonlyMap<string, CatalogIngredient>
  /** Basiques (sel, huile…) confirmés par l'utilisateur. */
  staples: ReadonlySet<string>
  /** Nombre de portions souhaité. */
  servings: number
  today?: string
}

// ─── Préparation de l'inventaire ──────────────────────────────────────────────

interface PantryEntry {
  /** Produits utilisables reliés de façon sûre. */
  certain: InventoryItem[]
  /** Produits utilisables reliés seulement de façon probable. */
  probable: InventoryItem[]
  unusable: { item: InventoryItem; reason: UnusableReason }[]
}

interface Pantry {
  byIngredient: Map<string, PantryEntry>
  priorities: Map<string, Priority>
}

const matchersCache = new WeakMap<ReadonlyMap<string, CatalogIngredient>, ReturnType<typeof buildMatchers>>()
function matchersFor(catalog: ReadonlyMap<string, CatalogIngredient>) {
  let m = matchersCache.get(catalog)
  if (!m) {
    m = buildMatchers([...catalog.values()])
    matchersCache.set(catalog, m)
  }
  return m
}

export function preparePantry(inventory: InventoryItem[], catalog: ReadonlyMap<string, CatalogIngredient>, today: string): Pantry {
  const matchers = matchersFor(catalog)
  const byIngredient = new Map<string, PantryEntry>()
  const priorities = new Map<string, Priority>()
  const seen = new Set<string>()
  for (const item of inventory) {
    // Une même entrée n'est jamais comptée deux fois.
    if (seen.has(item.id)) continue
    seen.add(item.id)
    const link = resolveLink(item, matchers)
    if (!link) continue
    const priority = computePriority(item, today)
    priorities.set(item.id, priority)
    const entry = byIngredient.get(link.ingredientId) ?? { certain: [], probable: [], unusable: [] }
    byIngredient.set(link.ingredientId, entry)
    if (priority.safety === 'do-not-eat') entry.unusable.push({ item, reason: 'use-by-expired' })
    else if (priority.safety === 'check') entry.unusable.push({ item, reason: 'date-to-check' })
    else if (item.quantity === 0) entry.unusable.push({ item, reason: 'empty' })
    else if (link.certainty === 'probable') entry.probable.push(item)
    else entry.certain.push(item)
  }
  return { byIngredient, priorities }
}

// ─── Évaluation d'une ligne ───────────────────────────────────────────────────

const EPSILON = 1e-9
const round2 = (n: number) => Math.round(n * 100) / 100

export function scaleIngredient(ri: RecipeIngredient, base: number, servings: number): RecipeIngredient {
  if (ri.quantity === null || ri.unit === null) return ri
  return { ...ri, quantity: scaleQuantity(ri.quantity, ri.unit, base, servings) }
}

function assessLine(
  ri: RecipeIngredient,
  pantry: Pantry,
  ctx: EngineContext,
  /** Quantité du même ingrédient déjà réservée par une autre ligne (évite le double comptage). */
  alreadyReserved = 0,
): LineEvaluation {
  const entry = pantry.byIngredient.get(ri.ingredientId) ?? { certain: [], probable: [], unusable: [] }
  const base: LineEvaluation = {
    ingredientId: ri.ingredientId,
    name: ctx.catalog.get(ri.ingredientId)?.name ?? ri.ingredientId,
    quantity: ri.quantity,
    unit: ri.unit,
    optional: ri.optional ?? false,
    note: ri.note,
    status: 'missing',
    source: null,
    items: [],
    have: null,
    shortfall: null,
    uncertainty: [],
    unusable: entry.unusable,
    substitution: null,
  }
  const stapleConfirmed = ctx.catalog.get(ri.ingredientId)?.category === 'staple' && ctx.staples.has(ri.ingredientId)

  if (entry.certain.length === 0) {
    if (entry.probable.length > 0) {
      return { ...base, status: 'uncertain', source: 'inventory', items: entry.probable, uncertainty: ['probable-match'] }
    }
    if (stapleConfirmed) return { ...base, status: 'available', source: 'staple' }
    return base
  }

  const withItems = { ...base, source: 'inventory' as const, items: entry.certain }
  if (ri.quantity === null || ri.unit === null) return { ...withItems, status: 'available' }

  const need = ri.quantity + alreadyReserved
  let known = 0
  const uncertainty = new Set<Uncertainty>()
  for (const item of entry.certain) {
    if (item.quantity === null) {
      uncertainty.add('quantity-unknown')
      continue
    }
    const converted = convert(item.quantity, item.unit, ri.unit)
    if (converted === null) uncertainty.add('unit-incompatible')
    else known += converted
  }
  const have = round2(Math.max(0, known - alreadyReserved))
  if (known + EPSILON >= need) return { ...withItems, status: 'available', have }
  if (uncertainty.size > 0) return { ...withItems, status: 'uncertain', have, uncertainty: [...uncertainty] }
  if (entry.probable.length > 0) {
    return { ...withItems, items: [...entry.certain, ...entry.probable], status: 'uncertain', have, uncertainty: ['probable-match'] }
  }
  return { ...withItems, status: 'insufficient', have, shortfall: round2(need - known) }
}

// ─── Évaluation d'une recette ─────────────────────────────────────────────────

export const totalMinutes = (r: Recipe) => r.prepMinutes + r.cookMinutes

export function evaluateRecipe(recipe: Recipe, pantry: Pantry, ctx: EngineContext): RecipeEvaluation {
  const servingsLocked = !recipe.scalable && ctx.servings !== recipe.servings
  const servings = recipe.scalable ? Math.max(1, Math.round(ctx.servings)) : recipe.servings
  const scaled = recipe.ingredients.map((ri) => scaleIngredient(ri, recipe.servings, servings))

  const lines = scaled.map((ri) => {
    const line = assessLine(ri, pantry, ctx)
    if (line.optional || (line.status !== 'missing' && line.status !== 'insufficient')) return line
    // Ingrédient obligatoire indisponible : un remplacement prévu par la recette suffit-il ?
    for (const sub of recipe.substitutions.filter((s) => s.replaces === ri.ingredientId)) {
      const subLines = sub.use.map((u) => {
        const su = scaleIngredient(u, recipe.servings, servings)
        // Si la recette utilise déjà cet ingrédient ailleurs, on réserve d'abord sa part.
        const own = scaled.find((o) => o.ingredientId === su.ingredientId)
        const reserved = own?.quantity != null && own.unit && su.unit ? convert(own.quantity, own.unit, su.unit) : 0
        if (reserved === null) return { ...assessLine(su, pantry, ctx), status: 'uncertain' as const }
        return assessLine(su, pantry, ctx, reserved)
      })
      if (subLines.every((l) => l.status === 'available')) {
        return { ...line, status: 'substituted' as const, substitution: { note: sub.note, lines: subLines } }
      }
    }
    return line
  })

  const required = lines.filter((l) => !l.optional)
  const toBuy = required.filter((l) => l.status === 'missing' || l.status === 'insufficient')
  const toConfirm = required.filter((l) => l.status === 'uncertain')
  const feasibility: Feasibility = toBuy.length > 0 ? 'shopping' : toConfirm.length > 0 ? 'to-confirm' : 'ready'

  const used = new Map<string, InventoryItem>()
  for (const l of lines) {
    if (l.uncertainty.includes('probable-match')) continue
    for (const i of l.items) used.set(i.id, i)
    for (const sl of l.substitution?.lines ?? []) for (const i of sl.items) used.set(i.id, i)
  }
  const usedItems = [...used.values()]
  const priorityItems = usedItems
    .map((item) => ({ item, priority: pantry.priorities.get(item.id)! }))
    .filter(({ priority }) => priority && (priority.level === 'high' || priority.level === 'medium'))
    .sort((a, b) => b.priority.score - a.priority.score || a.item.name.localeCompare(b.item.name, 'fr'))

  return { recipe, servings, servingsLocked, lines, feasibility, toBuy, toConfirm, usedItems, priorityItems, totalMinutes: totalMinutes(recipe) }
}

// ─── Classement ───────────────────────────────────────────────────────────────

const TIER: Record<Feasibility, number> = { ready: 2, 'to-confirm': 1, shopping: 0 }

/** Poids d'un produit prioritaire : priorité haute = 2, moyenne = 1. */
export function priorityWeight(e: RecipeEvaluation): number {
  return e.priorityItems.reduce((sum, { priority }) => sum + (priority.level === 'high' ? 2 : 1), 0)
}

/**
 * Ordre de classement, critère par critère (le suivant ne sert qu'en cas d'égalité) :
 * 1. faisabilité : faisable > à confirmer > courses nécessaires (jamais l'inverse) ;
 * 2. produits prioritaires utilisés (haute = 2 points, moyenne = 1) ;
 * 3. moins d'ingrédients à acheter ;
 * 4. moins d'ingrédients à confirmer ;
 * 5. temps total le plus court ;
 * 6. identifiant de la recette (ordre stable pour des entrées identiques).
 */
export function compareEvaluations(a: RecipeEvaluation, b: RecipeEvaluation): number {
  return (
    TIER[b.feasibility] - TIER[a.feasibility] ||
    priorityWeight(b) - priorityWeight(a) ||
    a.toBuy.length - b.toBuy.length ||
    a.toConfirm.length - b.toConfirm.length ||
    a.totalMinutes - b.totalMinutes ||
    a.recipe.id.localeCompare(b.recipe.id)
  )
}

/**
 * Choisit jusqu'à `limit` recettes en évitant les doublons de famille (deux gratins de pâtes…),
 * mais SANS jamais faire passer une recette moins faisable devant une plus faisable :
 * la variété ne joue qu'à l'intérieur d'un même niveau de faisabilité.
 */
export function pickVaried(ranked: RecipeEvaluation[], limit: number): RecipeEvaluation[] {
  const picked: RecipeEvaluation[] = []
  const families = new Set<string>()
  for (const tier of ['ready', 'to-confirm', 'shopping'] as const) {
    const group = ranked.filter((e) => e.feasibility === tier)
    const fresh: RecipeEvaluation[] = []
    const repeats: RecipeEvaluation[] = []
    for (const e of group) {
      if (!families.has(e.recipe.family) && !fresh.some((f) => f.recipe.family === e.recipe.family)) fresh.push(e)
      else repeats.push(e)
    }
    for (const e of [...fresh, ...repeats]) {
      if (picked.length >= limit) return picked
      picked.push(e)
      families.add(e.recipe.family)
    }
  }
  return picked
}

// ─── Explications ─────────────────────────────────────────────────────────────

/** Courte description d'une ligne à acheter ou à confirmer : « œuf (il manque 1 unité) ». */
export function describeLine(l: LineEvaluation): string {
  const name = l.name.toLocaleLowerCase('fr-FR')
  if (l.status === 'insufficient' && l.shortfall !== null) return `${name} (il manque ${formatQuantity(l.shortfall, l.unit)})`
  if (l.status === 'uncertain') {
    if (l.uncertainty.includes('probable-match')) return `${name} (correspondance à confirmer)`
    if (l.uncertainty.includes('unit-incompatible')) return `${name} (unités différentes)`
    return `${name} (quantité inconnue)`
  }
  return name
}

/** Raison courte de la priorité d'un produit, sans rien inventer. */
export function shortPriorityReason(item: InventoryItem, priority: Priority, today: string): string {
  if (item.dateLabel) {
    const kind = item.dateLabel.kind === 'use-by' ? 'DLC' : item.dateLabel.kind === 'best-before' ? 'DDM' : 'date'
    const days = daysUntil(item.dateLabel.date, today)
    return days < 0 ? `${kind} dépassée` : `${kind} ${relativeDays(days)}`
  }
  if (item.urgent) return 'marqué prioritaire'
  if (item.status === 'leftover') return 'reste cuisiné'
  if (item.status === 'opened') return 'entamé'
  return priority.level === 'high' ? 'prioritaire' : 'à utiliser bientôt'
}

export function explain(e: RecipeEvaluation, today: string): string[] {
  const reasons: string[] = []
  if (e.feasibility === 'ready') reasons.push('Faisable avec ce que vous avez.')
  else if (e.feasibility === 'to-confirm') reasons.push(`À confirmer : ${e.toConfirm.map(describeLine).join(', ')}.`)
  else reasons.push(`À acheter : ${e.toBuy.map(describeLine).join(', ')}.`)

  const substituted = e.lines.filter((l) => l.status === 'substituted')
  if (substituted.length > 0) {
    reasons.push(
      `Avec remplacement : ${substituted
        .map((l) => `${l.name.toLocaleLowerCase('fr-FR')} → ${l.substitution!.lines.map((s) => s.name.toLocaleLowerCase('fr-FR')).join(' + ')}`)
        .join(', ')}.`,
    )
  }

  if (e.priorityItems.length > 0) {
    const list = e.priorityItems.map(({ item, priority }) => `${item.name} (${shortPriorityReason(item, priority, today)})`)
    reasons.push(`Utilise ${list.length > 1 ? `${list.length} produits à écouler` : 'un produit à écouler'} : ${list.join(', ')}.`)
  } else if (e.usedItems.length > 0) {
    reasons.push('Aucun produit signalé comme prioritaire : sans date ni état renseigné, l’urgence reste incertaine.')
  }

  const blocked = e.lines.flatMap((l) => l.unusable.filter((u) => u.reason !== 'empty'))
  for (const { item, reason } of blocked) {
    reasons.push(`${item.name} n’est pas utilisé : ${reason === 'use-by-expired' ? 'DLC dépassée' : 'date dépassée à vérifier'}.`)
  }

  if (e.servingsLocked) reasons.push(`Quantités pour ${e.servings} portions : cette recette ne s’ajuste pas.`)
  reasons.push(`Prête en ${e.totalMinutes} min.`)
  return reasons
}

// ─── Recommandations ──────────────────────────────────────────────────────────

export interface RecommendationResult {
  /** Au plus `limit` recettes, variées, dans l'ordre de classement. */
  recommendations: Recommendation[]
  /** Toutes les recettes qui utilisent l'inventaire et respectent le mode choisi, classées. */
  ranked: Recommendation[]
  /** Mode strict : recettes écartées car il faudrait acheter quelque chose (avec la raison). */
  excluded: Recommendation[]
  /** Évaluation de toutes les recettes, dans l'ordre de classement. */
  all: RecipeEvaluation[]
}

export function recommend(
  recipes: Recipe[],
  inventory: InventoryItem[],
  ctx: EngineContext & { strict?: boolean; limit?: number },
): RecommendationResult {
  const today = ctx.today ?? todayISO()
  const pantry = preparePantry(inventory, ctx.catalog, today)
  const all = recipes.map((r) => evaluateRecipe(r, pantry, { ...ctx, today })).sort(compareEvaluations)
  // Une recette qui n'utilise rien de l'inventaire n'est pas une suggestion anti-gaspi.
  const usingInventory = all.filter((e) => e.lines.some((l) => l.source === 'inventory'))
  const eligible = ctx.strict ? usingInventory.filter((e) => e.feasibility !== 'shopping') : usingInventory
  const excluded = ctx.strict ? usingInventory.filter((e) => e.feasibility === 'shopping') : []
  const withReasons = (e: RecipeEvaluation): Recommendation => ({ evaluation: e, reasons: explain(e, today) })
  return {
    recommendations: pickVaried(eligible, ctx.limit ?? 3).map(withReasons),
    ranked: eligible.map(withReasons),
    excluded: excluded.map(withReasons),
    all,
  }
}

/** Évalue une seule recette (page de détail). */
export function evaluateOne(recipe: Recipe, inventory: InventoryItem[], ctx: EngineContext): Recommendation {
  const today = ctx.today ?? todayISO()
  const e = evaluateRecipe(recipe, preparePantry(inventory, ctx.catalog, today), { ...ctx, today })
  return { evaluation: e, reasons: explain(e, today) }
}
