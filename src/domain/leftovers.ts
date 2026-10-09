/**
 * Restes : règles pures (sans React ni base de données).
 *
 * Choix documentés :
 * - un reste n'est relié qu'à un ingrédient « cuisiné » du catalogue (riz cuit, légumes cuits, soupe…) :
 *   un reste de riz n'est jamais confondu avec du riz cru ;
 * - la date de préparation n'est jamais une date limite ; seule une date fixée par l'utilisateur en est une,
 *   « de sécurité » (traitée comme une DLC) ou « indicative » (traitée comme une DDM) ;
 * - Mijoté ne calcule aucune durée de conservation : sans date limite, il l'indique.
 */
import type { CatalogIngredient, InventoryItem, Leftover } from './types'
import { computePriority, type Priority } from './priority'
import { daysUntil, formatDate, relativeDays, todayISO } from './dates'
import { leftoverSchema } from './schemas'
import { buildMatchers, linkIngredient } from './ingredients'

/** Équivalent cuisiné d'un ingrédient cru, pour convertir les anciens « restes cuisinés » de l'inventaire. */
const COOKED_EQUIVALENT: Record<string, string> = {
  riz: 'riz-cuit',
  pates: 'pates-cuites',
  poulet: 'poulet-cuit',
}

const matchersCache = new WeakMap<ReadonlyMap<string, CatalogIngredient>, ReturnType<typeof buildMatchers>>()
function matchersFor(catalog: ReadonlyMap<string, CatalogIngredient>) {
  let m = matchersCache.get(catalog)
  if (!m) matchersCache.set(catalog, (m = buildMatchers([...catalog.values()])))
  return m
}

/**
 * Ingrédient cuisiné correspondant à un reste : l'identifiant connu s'il est déjà « cuisiné »,
 * sinon celui déduit du nom, sinon l'équivalent cuisiné d'un ingrédient cru (riz → riz cuit) ; null si aucun.
 */
export function cookedLinkFor(
  name: string,
  knownId: string | null,
  catalog: ReadonlyMap<string, CatalogIngredient>,
): string | null {
  const isPrepared = (id: string | null | undefined) => !!id && catalog.get(id)?.category === 'prepared'
  if (isPrepared(knownId)) return knownId
  const linked = linkIngredient(name, matchersFor(catalog))?.ingredientId
  if (isPrepared(linked)) return linked!
  const raw = knownId ?? linked
  return raw ? (COOKED_EQUIVALENT[raw] ?? null) : null
}

/**
 * Présente un reste disponible au moteur de recettes comme un produit en stock :
 * état « leftover », relié à son ingrédient cuisiné, avec sa date limite éventuelle.
 */
export function leftoverAsStock(l: Leftover): InventoryItem {
  return {
    id: l.id,
    name: l.name,
    ingredientId: l.ingredientId,
    linkConfirmed: true,
    category: 'prepared',
    quantity: l.quantity,
    unit: l.unit,
    location: 'fridge',
    status: 'leftover',
    purchasedOn: null,
    openedOn: l.preparedOn,
    dateLabel: l.limit,
    urgent: false,
    source: 'manual',
    confirmed: true,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }
}

/** Priorité d'un reste : mêmes niveaux que l'inventaire, explications propres aux restes. */
export function computeLeftoverPriority(l: Leftover, today: string = todayISO()): Priority {
  const base = computePriority(leftoverAsStock(l), today)
  const reasons: string[] = []
  if (l.quantity === 0) return base
  if (l.limit) {
    const days = daysUntil(l.limit.date, today)
    const date = formatDate(l.limit.date, today)
    if (l.limit.kind === 'use-by') {
      reasons.push(
        days < 0
          ? `La date limite de sécurité que vous avez fixée (${date}) est dépassée. Mijoté ne le propose plus dans les recettes.`
          : `Date limite de sécurité fixée au ${date} (${relativeDays(days)}).`,
      )
    } else if (l.limit.kind === 'best-before') {
      reasons.push(
        days < 0
          ? `Date indicative dépassée (${date}) : ce n’est pas une limite de sécurité, vérifiez la conservation.`
          : `Date indicative : ${date} (${relativeDays(days)}).`,
      )
    } else {
      reasons.push(
        days < 0
          ? `Date dépassée (${date}), type non précisé : vérifiez avant de consommer.`
          : `Date fixée au ${date} (${relativeDays(days)}), type non précisé.`,
      )
    }
  }
  const age = -daysUntil(l.preparedOn, today)
  reasons.push(
    `Préparé ${age <= 0 ? "aujourd'hui" : age === 1 ? 'hier' : `il y a ${age} jours`} (${formatDate(l.preparedOn, today)}).` +
      (l.limit ? '' : ' Aucune date limite fixée : Mijoté ne calcule pas de durée de conservation.'),
  )
  return { ...base, reasons }
}

/** Les restes disponibles, du plus urgent au moins urgent (ordre stable). */
export function sortLeftovers(leftovers: Leftover[], today: string = todayISO()) {
  return leftovers
    .map((leftover) => ({ leftover, priority: computeLeftoverPriority(leftover, today) }))
    .sort((a, b) => b.priority.score - a.priority.score || a.leftover.preparedOn.localeCompare(b.leftover.preparedOn) || a.leftover.id.localeCompare(b.leftover.id))
}

/**
 * Convertit un ancien produit d'inventaire marqué « Reste cuisiné » en reste (migration v3, sauvegardes v1/v2).
 * Aucune donnée n'est perdue : nom, quantité, unité, dates et note de rangement sont repris.
 */
export function inventoryItemToLeftover(item: InventoryItem, catalog: ReadonlyMap<string, CatalogIngredient>): Leftover {
  return {
    id: item.id,
    name: item.name,
    // Lien confirmé par l'utilisateur s'il existe, sinon déduit du nom ; toujours vers un ingrédient cuisiné.
    ingredientId: cookedLinkFor(item.name, item.linkConfirmed ? item.ingredientId : null, catalog),
    quantity: item.quantity,
    unit: item.unit,
    preparedOn: item.openedOn ?? item.createdAt.slice(0, 10),
    limit: item.dateLabel,
    status: item.quantity === 0 ? 'consumed' : 'available',
    note: null,
    recipeId: null,
    preparationId: null,
    source: item.source === 'demo' ? 'demo' : 'manual',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    closedAt: null,
  }
}

export interface StoredLeftovers {
  leftovers: Leftover[]
  unreadable: { id: string; name: string; problem: string }[]
}

/** Valide les restes lus en base : un enregistrement illisible est signalé, jamais supprimé ni affiché tel quel. */
export function readStoredLeftovers(raw: unknown[]): StoredLeftovers {
  const leftovers: Leftover[] = []
  const unreadable: StoredLeftovers['unreadable'] = []
  for (const record of raw) {
    const parsed = leftoverSchema.safeParse(record)
    if (parsed.success) {
      leftovers.push(parsed.data)
      continue
    }
    const r = (typeof record === 'object' && record !== null ? record : {}) as Record<string, unknown>
    const issue = parsed.error.issues[0]
    unreadable.push({
      id: typeof r.id === 'string' ? r.id : '(sans identifiant)',
      name: typeof r.name === 'string' && r.name.trim() ? r.name : '(sans nom)',
      problem: `${issue?.path.join('.') || 'enregistrement'} : ${issue?.message ?? 'format inattendu'}`,
    })
  }
  return { leftovers, unreadable }
}
