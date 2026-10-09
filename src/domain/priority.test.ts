import { describe, expect, it } from 'vitest'
import { computePriority, needsAttention, prioritize } from './priority'
import { makeItem } from './test-helpers'

const TODAY = '2026-03-30'
const p = (overrides: Parameters<typeof makeItem>[0]) => computePriority(makeItem(overrides), TODAY)

describe('computePriority', () => {
  it('sans aucune information, la priorité est incertaine (rien n’est inventé)', () => {
    const r = p({})
    expect(r.level).toBe('uncertain')
    expect(r.safety).toBe('ok')
    expect(r.reasons[0]).toMatch(/incertaine/)
  })

  it('DLC dépassée : ne pas consommer', () => {
    const r = p({ dateLabel: { kind: 'use-by', date: '2026-03-29' } })
    expect(r.safety).toBe('do-not-eat')
    expect(r.reasons[0]).toMatch(/ne pas consommer/)
  })

  it('DDM dépassée : pas interdite, mais à vérifier et prioritaire', () => {
    const r = p({ dateLabel: { kind: 'best-before', date: '2026-03-29' } })
    expect(r.safety).toBe('ok')
    expect(r.level).toBe('high')
    expect(r.reasons[0]).toMatch(/n'est pas une date limite de consommation/)
  })

  it('ne traite pas DLC et DDM de la même façon', () => {
    const dlc = p({ dateLabel: { kind: 'use-by', date: '2026-04-03' } })
    const ddm = p({ dateLabel: { kind: 'best-before', date: '2026-04-03' } })
    expect(dlc.level).toBe('medium')
    expect(ddm.level).toBe('low')
  })

  it('date de type inconnu dépassée : à vérifier', () => {
    expect(p({ dateLabel: { kind: 'unspecified', date: '2026-03-20' } }).safety).toBe('check')
  })

  it('DLC proche : haute priorité avec une raison lisible', () => {
    const r = p({ dateLabel: { kind: 'use-by', date: '2026-03-31' } })
    expect(r.level).toBe('high')
    expect(r.reasons[0]).toBe('DLC le 31 mars (demain).')
  })

  it('prend en compte l’urgence saisie, les restes et les produits entamés', () => {
    expect(p({ urgent: true }).level).toBe('high')
    expect(p({ status: 'leftover' }).level).toBe('medium')
    expect(p({ status: 'opened', openedOn: '2026-03-28' }).reasons[0]).toMatch(/Entamé le 28 mars/)
  })

  it('un produit congelé est peu urgent', () => {
    expect(p({ status: 'frozen' }).level).toBe('low')
  })

  it('un produit épuisé passe en dernier', () => {
    expect(p({ quantity: 0, urgent: true }).reasons[0]).toMatch(/Épuisé/)
  })
})

describe('prioritize / needsAttention', () => {
  const items = [
    makeItem({ id: 'a', name: 'Sans info' }),
    makeItem({ id: 'b', name: 'DLC demain', dateLabel: { kind: 'use-by', date: '2026-03-31' } }),
    makeItem({ id: 'c', name: 'Entamé', status: 'opened' }),
    makeItem({ id: 'd', name: 'DLC passée', dateLabel: { kind: 'use-by', date: '2026-03-01' } }),
  ]
  it('liste les produits prioritaires du plus au moins urgent, sans les produits à ne pas consommer', () => {
    expect(prioritize(items, TODAY).map((x) => x.item.id)).toEqual(['b', 'c'])
  })
  it('isole les produits à vérifier', () => {
    expect(needsAttention(items, TODAY).map((x) => x.item.id)).toEqual(['d'])
  })
})
