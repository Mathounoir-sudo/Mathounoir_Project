import { CATALOG_BY_ID } from '../../data/catalog'
import type { Feasibility } from '../../domain/recipe-engine'
import type { Tone } from '../../components/Badge'

/** Nom lisible d'un ingrédient du catalogue, en minuscules pour s'insérer dans une phrase. */
export function ingredientLabel(id: string): string {
  return CATALOG_BY_ID.get(id)?.name.toLocaleLowerCase('fr-FR') ?? id
}

export const FEASIBILITY: Record<Feasibility, { label: string; tone: Tone }> = {
  ready: { label: 'Faisable', tone: 'ok' },
  'to-confirm': { label: 'À confirmer', tone: 'warn' },
  shopping: { label: 'Courses nécessaires', tone: 'accent' },
}
