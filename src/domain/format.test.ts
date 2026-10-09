import { describe, expect, it } from 'vitest'
import { formatQuantity } from './format'

describe('formatQuantity', () => {
  it('formate les quantités', () => {
    expect(formatQuantity(4, 'tranche')).toBe('4 tranches')
    expect(formatQuantity(1, 'tranche')).toBe('1 tranche')
    expect(formatQuantity(2, 'pièce')).toBe('2')
    expect(formatQuantity(1.5, 'kg')).toBe('1,5 kg')
    expect(formatQuantity(20, 'cl')).toBe('20 cl')
    expect(formatQuantity(null, 'g')).toBe('')
  })
})
