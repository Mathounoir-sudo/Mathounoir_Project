import { describe, expect, it } from 'vitest'
import { adjustQuantity, formatQuantity, parseQuantity, stepFor } from './quantity'

describe('quantités', () => {
  it('choisit un pas adapté à l’unité', () => {
    expect(stepFor('unité')).toBe(1)
    expect(stepFor('g')).toBe(50)
    expect(stepFor('kg')).toBe(0.1)
  })
  it('augmente et diminue sans erreur d’arrondi', () => {
    expect(adjustQuantity(0.2, 'kg', 1)).toBe(0.3)
    expect(adjustQuantity(3, 'unité', -1)).toBe(2)
  })
  it('ne descend jamais sous zéro', () => {
    expect(adjustQuantity(20, 'g', -1)).toBe(0)
    expect(adjustQuantity(0, 'unité', -1)).toBe(0)
  })
  it('laisse une quantité inconnue inconnue', () => {
    expect(adjustQuantity(null, 'g', 1)).toBeNull()
  })
  it('formate en français', () => {
    expect(formatQuantity(1.5, 'kg')).toBe('1,5 kg')
    expect(formatQuantity(4, 'tranche')).toBe('4 tranches')
    expect(formatQuantity(1, 'unité')).toBe('1 unité')
    expect(formatQuantity(null, 'g')).toBe('Quantité inconnue')
    expect(formatQuantity(null, null)).toBe('Selon le goût')
  })
  it('lit la saisie', () => {
    expect(parseQuantity('1,5')).toBe(1.5)
    expect(parseQuantity(' ')).toBeNull()
    expect(parseQuantity('-2')).toBeNaN()
    expect(parseQuantity('abc')).toBeNaN()
  })
})
