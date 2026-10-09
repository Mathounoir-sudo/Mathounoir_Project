import { describe, expect, it } from 'vitest'
import { normalize, normalizeSingular } from './text'

describe('normalize', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(normalize('  Crème Fraîche ! ')).toBe('creme fraiche')
    expect(normalize('Œufs')).toBe('oeufs')
    expect(normalize("Huile d'olive")).toBe('huile d olive')
  })
  it('retire les pluriels simples', () => {
    expect(normalizeSingular('Tomates cerises')).toBe('tomate cerise')
    expect(normalizeSingular('Poireaux')).toBe('poireau')
  })
})
