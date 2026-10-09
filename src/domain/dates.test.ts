import { describe, expect, it } from 'vitest'
import { addDays, daysUntil, formatDate, isValidISODate, relativeDays, todayISO } from './dates'

const TODAY = '2026-03-30'

describe('dates', () => {
  it('formate la date du jour en heure locale', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
  it('compte les jours, y compris au changement d’heure', () => {
    expect(daysUntil('2026-03-31', TODAY)).toBe(1)
    expect(daysUntil('2026-03-28', TODAY)).toBe(-2)
    expect(daysUntil('2026-03-29', '2026-03-28')).toBe(1)
  })
  it('ajoute des jours en changeant de mois', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('affiche des dates lisibles', () => {
    expect(formatDate('2026-04-12', TODAY)).toBe('12 avril')
    expect(formatDate('2027-01-02', TODAY)).toBe('2 janvier 2027')
    expect(relativeDays(0)).toBe("aujourd'hui")
    expect(relativeDays(3)).toBe('dans 3 jours')
    expect(relativeDays(-4)).toBe('il y a 4 jours')
  })
  it('valide les dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('30/03/2026')).toBe(false)
  })
})
