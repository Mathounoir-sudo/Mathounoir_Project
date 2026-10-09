import type { InventoryItem } from './types'
import { daysUntil, formatDate, relativeDays, todayISO } from './dates'

/**
 * Niveau de priorité anti-gaspi :
 * - high / medium / low : à quel point il faut l'utiliser vite ;
 * - uncertain : pas assez d'informations pour le dire (on ne devine jamais une date).
 */
export type PriorityLevel = 'high' | 'medium' | 'low' | 'uncertain'

/**
 * Sécurité, décidée uniquement à partir des dates saisies par l'utilisateur :
 * - do-not-eat : DLC dépassée ;
 * - check : date dépassée dont on ne connaît pas le type (DLC ou DDM ?) ;
 * - ok : rien ne l'interdit d'après les informations saisies (ce n'est pas une garantie).
 */
export type Safety = 'ok' | 'check' | 'do-not-eat'

export interface Priority {
  level: PriorityLevel
  safety: Safety
  /** Explications courtes et transparentes, dans l'ordre d'importance. */
  reasons: string[]
  /** Pour le tri : plus c'est haut, plus c'est urgent. */
  score: number
}

const LEVEL_RANK: Record<PriorityLevel, number> = { uncertain: 0, low: 1, medium: 2, high: 3 }

export function computePriority(item: InventoryItem, today: string = todayISO()): Priority {
  const reasons: string[] = []
  let level: PriorityLevel = 'low'
  let safety: Safety = 'ok'
  let hasSignal = false
  let score = 0

  const raise = (to: PriorityLevel) => {
    if (LEVEL_RANK[to] > LEVEL_RANK[level]) level = to
  }

  if (item.quantity === 0) {
    return { level: 'low', safety: 'ok', reasons: ['Épuisé : pensez à le retirer ou à corriger la quantité.'], score: -1000 }
  }

  if (item.dateLabel) {
    hasSignal = true
    const { kind, date } = item.dateLabel
    const days = daysUntil(date, today)
    const when = `${formatDate(date, today)} (${relativeDays(days)})`
    // Plus la date est proche, plus le score monte ; une date passée compte comme « aujourd'hui ».
    score += Math.max(0, 30 - Math.max(days, 0))

    if (kind === 'use-by') {
      if (days < 0) {
        safety = 'do-not-eat'
        reasons.push(`DLC dépassée le ${formatDate(date, today)} : ne pas consommer.`)
      } else if (days <= 2) {
        raise('high')
        reasons.push(`DLC le ${when}.`)
      } else if (days <= 5) {
        raise('medium')
        reasons.push(`DLC le ${when}.`)
      } else {
        reasons.push(`DLC le ${when}.`)
      }
    } else if (kind === 'best-before') {
      if (days < 0) {
        raise('high')
        reasons.push(
          `DDM dépassée le ${formatDate(date, today)}. Une DDM n'est pas une date limite de consommation : vérifiez que l'emballage est intact et que le produit a été conservé comme indiqué.`,
        )
      } else if (days <= 3) {
        raise('medium')
        reasons.push(`DDM le ${when}.`)
      } else {
        reasons.push(`DDM le ${when}.`)
      }
    } else {
      if (days < 0) {
        safety = 'check'
        reasons.push(
          `Date dépassée le ${formatDate(date, today)}, type inconnu : vérifiez l'étiquette. S'il s'agit d'une DLC, ne pas consommer.`,
        )
      } else if (days <= 2) {
        raise('high')
        reasons.push(`Date le ${when} (DLC ou DDM non précisé : vérifiez l'étiquette).`)
      } else {
        reasons.push(`Date le ${when} (DLC ou DDM non précisé).`)
      }
    }
  }

  if (item.urgent) {
    hasSignal = true
    raise('high')
    score += 20
    reasons.push('Vous l’avez marqué à utiliser en priorité.')
  }

  if (item.status === 'leftover') {
    hasSignal = true
    raise('medium')
    score += 15
    reasons.push(
      item.openedOn
        ? `Reste cuisiné le ${formatDate(item.openedOn, today)} : les restes se gardent peu de temps, vérifiez qu'il a été réfrigéré rapidement.`
        : 'Reste cuisiné : les restes se gardent peu de temps. Date de préparation non renseignée.',
    )
  } else if (item.status === 'opened') {
    hasSignal = true
    raise('medium')
    score += 10
    reasons.push(
      `Entamé${item.openedOn ? ` le ${formatDate(item.openedOn, today)}` : ''} : respectez la durée de conservation après ouverture indiquée sur l'emballage.`,
    )
  } else if (item.status === 'frozen') {
    hasSignal = true
    score -= 10
    reasons.push('Congelé : moins urgent tant qu’il reste au congélateur.')
  }

  if (!hasSignal) {
    level = 'uncertain'
    reasons.push('Aucune date ni état renseigné : priorité incertaine.')
  }

  score += LEVEL_RANK[level] * 100
  if (safety !== 'ok') score += 1000
  return { level, safety, reasons, score }
}

/** Ingrédients à utiliser en priorité (high puis medium), les plus urgents d'abord. Exclut ceux à ne pas consommer. */
export function prioritize(items: InventoryItem[], today: string = todayISO()) {
  return items
    .map((item) => ({ item, priority: computePriority(item, today) }))
    .filter(({ priority }) => priority.safety === 'ok' && (priority.level === 'high' || priority.level === 'medium'))
    .sort((a, b) => b.priority.score - a.priority.score)
}

/** Ingrédients qui demandent une vérification ou ne doivent pas être consommés. */
export function needsAttention(items: InventoryItem[], today: string = todayISO()) {
  return items
    .map((item) => ({ item, priority: computePriority(item, today) }))
    .filter(({ priority }) => priority.safety !== 'ok')
}
