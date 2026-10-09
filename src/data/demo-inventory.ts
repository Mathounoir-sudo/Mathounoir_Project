import type { InventoryInput } from '../domain/types'
import { addDays } from '../domain/dates'

/**
 * Ingrédients FICTIFS pour essayer l'application. Les dates sont calculées par rapport
 * à aujourd'hui pour montrer les différents cas (DLC proche, DDM, reste, DLC dépassée…).
 * Ils sont marqués « démo » et peuvent être retirés en un geste depuis les Réglages.
 */
export function demoInventory(today: string): InventoryInput[] {
  const base = { purchasedOn: null, openedOn: null, dateLabel: null, urgent: false, location: 'fridge' as const }
  return [
    { ...base, name: 'Œufs', category: 'egg', quantity: 6, unit: 'unité', status: 'unopened', dateLabel: { kind: 'best-before', date: addDays(today, 12) } },
    { ...base, name: 'Lait demi-écrémé', category: 'dairy', quantity: 50, unit: 'cl', status: 'opened', openedOn: addDays(today, -2), dateLabel: { kind: 'use-by', date: addDays(today, 2) } },
    { ...base, name: 'Yaourt nature', category: 'dairy', quantity: 2, unit: 'unité', status: 'unopened', dateLabel: { kind: 'use-by', date: addDays(today, 1) } },
    { ...base, name: 'Fromage râpé', category: 'dairy', quantity: 80, unit: 'g', status: 'opened', openedOn: addDays(today, -3), dateLabel: { kind: 'use-by', date: addDays(today, 4) } },
    { ...base, name: 'Crème fraîche', category: 'dairy', quantity: 20, unit: 'cl', status: 'opened', dateLabel: { kind: 'use-by', date: addDays(today, -1) } },
    { ...base, name: 'Courgettes', category: 'vegetable', quantity: 2, unit: 'unité', status: 'unopened' },
    { ...base, name: 'Tomates', category: 'vegetable', quantity: 4, unit: 'unité', status: 'unopened', urgent: true },
    { ...base, name: 'Oignon', category: 'vegetable', quantity: 3, unit: 'unité', status: 'unopened', location: 'pantry' },
    { ...base, name: 'Bananes', category: 'fruit', quantity: 3, unit: 'unité', status: 'unopened', location: 'pantry', urgent: true },
    { ...base, name: 'Pain de campagne', category: 'starch', quantity: 4, unit: 'tranche', status: 'opened', location: 'pantry' },
    { ...base, name: 'Reste de riz', category: 'starch', quantity: 150, unit: 'g', status: 'leftover', openedOn: addDays(today, -1) },
    { ...base, name: 'Pâtes', category: 'starch', quantity: 500, unit: 'g', status: 'unopened', location: 'pantry', dateLabel: { kind: 'best-before', date: addDays(today, 200) } },
    { ...base, name: 'Épinards', category: 'vegetable', quantity: 300, unit: 'g', status: 'frozen', location: 'freezer' },
  ]
}
