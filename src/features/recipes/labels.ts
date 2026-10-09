import { CATALOG_BY_ID } from '../../data/catalog'

/** Nom lisible d'un ingrédient du catalogue, en minuscules pour s'insérer dans une phrase. */
export function ingredientLabel(id: string): string {
  return CATALOG_BY_ID.get(id)?.name.toLocaleLowerCase('fr-FR') ?? id
}
