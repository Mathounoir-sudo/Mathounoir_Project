import { describe, expect, it } from 'vitest'
import { compareByExpiry, daysUntil, expiryLabel, expiryStatus, todayISO } from './dates'

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
  it('détermine le statut', () => {
    expect(expiryStatus(null, TODAY)).toBe('unknown')
    expect(expiryStatus('2026-03-29', TODAY)).toBe('expired')
    expect(expiryStatus(TODAY, TODAY)).toBe('today')
    expect(expiryStatus('2026-04-02', TODAY)).toBe('soon')
    expect(expiryStatus('2026-04-03', TODAY)).toBe('ok')
  })
  it('donne un libellé lisible', () => {
    expect(expiryLabel('2026-03-31', TODAY)).toBe('Demain')
    expect(expiryLabel('2026-03-25', TODAY)).toBe('Dépassé depuis 5 jours')
    expect(expiryLabel(null, TODAY)).toBe('Sans date')
  })
  it('trie les produits sans date à la fin', () => {
    const dates = [null, '2026-04-10', '2026-04-01']
    expect(dates.sort(compareByExpiry)).toEqual(['2026-04-01', '2026-04-10', null])
  })
})
