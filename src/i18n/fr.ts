import type { Category, DateKind, LeftoverStatus, Location, Status } from '../domain/types'

/** Libellés français des codes internes. Une autre langue = un autre fichier de même forme. */
export const fr = {
  category: {
    vegetable: 'Légumes',
    fruit: 'Fruits',
    dairy: 'Produits laitiers',
    egg: 'Œufs',
    'meat-fish': 'Viandes et poissons',
    starch: 'Féculents et pains',
    legume: 'Légumineuses',
    grocery: 'Épicerie',
    staple: 'Basiques',
    prepared: 'Plats et restes cuisinés',
    other: 'Autres',
  } satisfies Record<Category, string>,
  location: {
    fridge: 'Réfrigérateur',
    pantry: 'Placard',
    freezer: 'Congélateur',
  } satisfies Record<Location, string>,
  status: {
    unopened: 'Non entamé',
    opened: 'Entamé',
    leftover: 'Reste cuisiné',
    frozen: 'Congelé',
  } satisfies Record<Status, string>,
  dateKind: {
    'use-by': 'DLC — à consommer jusqu’au',
    'best-before': 'DDM — à consommer de préférence avant',
    unspecified: 'Type de date non précisé',
  } satisfies Record<DateKind, string>,
  dateKindShort: {
    'use-by': 'DLC',
    'best-before': 'DDM',
    unspecified: 'Date',
  } satisfies Record<DateKind, string>,
  leftoverStatus: {
    available: 'Disponible',
    consumed: 'Consommé',
    discarded: 'Jeté',
  } satisfies Record<LeftoverStatus, string>,
  /** Pour un reste, la date est fixée par l'utilisateur (pas d'étiquette d'emballage). */
  leftoverLimit: {
    'use-by': 'Limite de sécurité (à ne pas dépasser)',
    'best-before': 'Date indicative (qualité)',
    unspecified: 'Date sans précision',
  } satisfies Record<DateKind, string>,
}
