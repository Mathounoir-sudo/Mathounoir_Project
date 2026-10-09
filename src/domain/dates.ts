export type ExpiryStatus = 'expired' | 'today' | 'soon' | 'ok' | 'unknown'

/** Nombre de jours avant la date limite « bientôt » (inclus). */
export const SOON_DAYS = 3

/** Date du jour au format AAAA-MM-JJ, dans le fuseau local. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Nombre de jours entre aujourd'hui et la date (négatif si dépassée). */
export function daysUntil(dateISO: string, today: string = todayISO()): number {
  const toUTC = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  }
  return Math.round((toUTC(dateISO) - toUTC(today)) / 86_400_000)
}

export function expiryStatus(dateISO: string | null, today: string = todayISO()): ExpiryStatus {
  if (!dateISO) return 'unknown'
  const days = daysUntil(dateISO, today)
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  if (days <= SOON_DAYS) return 'soon'
  return 'ok'
}

export function expiryLabel(dateISO: string | null, today: string = todayISO()): string {
  if (!dateISO) return 'Sans date'
  const days = daysUntil(dateISO, today)
  if (days < -1) return `Dépassé depuis ${-days} jours`
  if (days === -1) return 'Dépassé depuis hier'
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

/** Trie : dates les plus proches d'abord, produits sans date à la fin. */
export function compareByExpiry(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}
