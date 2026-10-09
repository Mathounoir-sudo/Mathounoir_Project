/** Date du jour au format AAAA-MM-JJ, dans le fuseau local. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Ajoute (ou retire) des jours à une date AAAA-MM-JJ. */
export function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  return todayISO(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days))
}

/** Nombre de jours entre aujourd'hui et la date (négatif si dépassée). */
export function daysUntil(dateISO: string, today: string = todayISO()): number {
  const toUTC = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  }
  return Math.round((toUTC(dateISO) - toUTC(today)) / 86_400_000)
}

/** « 12 avril » (ou « 12 avril 2027 » si ce n'est pas l'année en cours). */
export function formatDate(dateISO: string, today: string = todayISO()): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  const sameYear = dateISO.slice(0, 4) === today.slice(0, 4)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
}

/** « aujourd'hui », « demain », « dans 3 jours », « hier », « il y a 4 jours ». */
export function relativeDays(days: number): string {
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days === -1) return 'hier'
  return days > 1 ? `dans ${days} jours` : `il y a ${-days} jours`
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m! - 1 && date.getUTCDate() === d
}
