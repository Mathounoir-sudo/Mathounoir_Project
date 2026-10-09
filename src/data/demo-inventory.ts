import type { InventoryInput } from '../domain/types'
import { addDays } from '../domain/dates'

/**
 * Ingrédients FICTIFS pour essayer l'application. Les dates sont calculées par rapport
 * à aujourd'hui pour montrer les différents cas (DLC proche, DDM, reste, DLC dépassée…).
 * Ils sont marqués « démo » et peuvent être retirés en un geste depuis les Réglages.
 * Chaque produit est relié explicitement à un ingrédient du catalogue.
 */
export function demoInventory(today: string): InventoryInput[] {
  const base = { purchasedOn: null, openedOn: null, dateLabel: null, urgent: false, location: 'fridge' as const }
  return [
    { ...base, name: 'Œufs', ingredientId: 'oeuf', category: 'egg', quantity: 6, unit: 'unité', status: 'unopened', dateLabel: { kind: 'best-before', date: addDays(today, 12) } },
    { ...base, name: 'Lait demi-écrémé', ingredientId: 'lait', category: 'dairy', quantity: 50, unit: 'cl', status: 'opened', openedOn: addDays(today, -2), dateLabel: { kind: 'use-by', date: addDays(today, 2) } },
    { ...base, name: 'Yaourt nature', ingredientId: 'yaourt', category: 'dairy', quantity: 2, unit: 'unité', status: 'unopened', dateLabel: { kind: 'use-by', date: addDays(today, 1) } },
    { ...base, name: 'Fromage râpé', ingredientId: 'fromage-rape', category: 'dairy', quantity: 80, unit: 'g', status: 'opened', openedOn: addDays(today, -3), dateLabel: { kind: 'use-by', date: addDays(today, 4) } },
    { ...base, name: 'Crème fraîche', ingredientId: 'creme', category: 'dairy', quantity: 20, unit: 'cl', status: 'opened', dateLabel: { kind: 'use-by', date: addDays(today, -1) } },
    { ...base, name: 'Courgettes', ingredientId: 'courgette', category: 'vegetable', quantity: 2, unit: 'unité', status: 'unopened' },
    { ...base, name: 'Tomates', ingredientId: 'tomate', category: 'vegetable', quantity: 4, unit: 'unité', status: 'unopened', urgent: true },
    { ...base, name: 'Oignon', ingredientId: 'oignon', category: 'vegetable', quantity: 3, unit: 'unité', status: 'unopened', location: 'pantry' },
    { ...base, name: 'Bananes', ingredientId: 'banane', category: 'fruit', quantity: 3, unit: 'unité', status: 'unopened', location: 'pantry', urgent: true },
    { ...base, name: 'Pain de campagne', ingredientId: 'pain', category: 'starch', quantity: 4, unit: 'tranche', status: 'opened', location: 'pantry' },
    { ...base, name: 'Reste de riz', ingredientId: 'riz', category: 'starch', quantity: 150, unit: 'g', status: 'leftover', openedOn: addDays(today, -1) },
    { ...base, name: 'Pâtes', ingredientId: 'pates', category: 'starch', quantity: 500, unit: 'g', status: 'unopened', location: 'pantry', dateLabel: { kind: 'best-before', date: addDays(today, 200) } },
    { ...base, name: 'Épinards', ingredientId: 'epinard', category: 'vegetable', quantity: 300, unit: 'g', status: 'frozen', location: 'freezer' },
  ]
}
