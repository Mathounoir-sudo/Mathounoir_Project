import { describe, expect, it } from 'vitest'
import { convert, roundForKitchen, scaleQuantity } from './units'

describe('conversions fiables', () => {
  it.each([
    [1, 'kg', 'g', 1000],
    [250, 'g', 'kg', 0.25],
    [0.5, 'l', 'cl', 50],
    [20, 'cl', 'ml', 200],
    [2, 'c. à s.', 'ml', 30],
    [3, 'c. à c.', 'c. à s.', 1],
  ] as const)('%s %s → %s %s', (q, from, to, expected) => {
    expect(convert(q, from, to)).toBeCloseTo(expected)
  })

  it.each([
    ['g', 'ml'],
    ['kg', 'l'],
    ['unité', 'g'],
    ['tranche', 'unité'],
    ['boîte', 'g'],
  ] as const)('refuse %s → %s', (from, to) => {
    expect(convert(1, from, to)).toBeNull()
  })
})

describe('arrondis de cuisine', () => {
  it('arrondit sensiblement selon l’unité', () => {
    expect(roundForKitchen(1.4, 'unité')).toBe(1.5)
    expect(roundForKitchen(0.2, 'unité')).toBe(0.5)
    expect(roundForKitchen(0.3, 'pincée')).toBe(1)
    expect(roundForKitchen(7.5, 'g')).toBe(8)
    expect(roundForKitchen(66.7, 'g')).toBe(65)
    expect(roundForKitchen(333, 'g')).toBe(330)
    expect(roundForKitchen(7.5, 'cl')).toBe(8)
    expect(roundForKitchen(2.3, 'cl')).toBe(2.5)
  })
  it('met à l’échelle depuis les portions de base', () => {
    expect(scaleQuantity(3, 'unité', 2, 1)).toBe(1.5)
    expect(scaleQuantity(200, 'g', 2, 3)).toBe(300)
    expect(scaleQuantity(20, 'cl', 2, 2)).toBe(20)
  })
})
