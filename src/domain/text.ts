/** Met un texte sous une forme comparable : minuscules, sans accents, sans ponctuation. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Retire un pluriel simple (« tomates » → « tomate », « poireaux » → « poireau »). */
export function singular(word: string): string {
  if (word.length > 3 && word.endsWith('aux')) return word.slice(0, -1)
  if (word.length > 2 && (word.endsWith('s') || word.endsWith('x'))) return word.slice(0, -1)
  return word
}

export function normalizeSingular(text: string): string {
  return normalize(text).split(' ').map(singular).join(' ')
}
