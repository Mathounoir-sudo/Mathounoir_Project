import { z } from 'zod'
import { CATEGORIES, DATE_KINDS, HEATS, LOCATIONS, STATUSES, UNITS } from './types'
import { isValidISODate } from './dates'

const isoDate = z.string().refine(isValidISODate, { message: 'Date invalide.' })

export const dateLabelSchema = z.object({ kind: z.enum(DATE_KINDS), date: isoDate })

/** Schéma d'un ingrédient enregistré (base locale, sauvegardes). */
export const inventoryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  ingredientId: z.string().nullable(),
  category: z.enum(CATEGORIES),
  quantity: z.number().min(0).nullable(),
  unit: z.enum(UNITS),
  location: z.enum(LOCATIONS).nullable(),
  status: z.enum(STATUSES),
  purchasedOn: isoDate.nullable(),
  openedOn: isoDate.nullable(),
  dateLabel: dateLabelSchema.nullable(),
  urgent: z.boolean(),
  source: z.enum(['manual', 'demo']),
  confirmed: z.boolean(),
  // Champ ajouté en phase 2 : absent des données plus anciennes, il vaut alors false.
  linkConfirmed: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const recipeIngredientSchema = z
  .object({
    ingredientId: z.string().min(1),
    quantity: z.number().positive().nullable(),
    unit: z.enum(UNITS).nullable(),
    optional: z.boolean().optional(),
    note: z.string().optional(),
  })
  // Une quantité sans unité (ou l'inverse) serait ambiguë.
  .refine((i) => (i.quantity === null) === (i.unit === null), { message: 'Quantité et unité vont ensemble.' })

/** Schéma d'une recette : toute recette (démo ou future source) est validée avant d'être affichée. */
export const recipeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    description: z.string().min(1),
    family: z.string().min(1),
    servings: z.number().int().min(1).max(12),
    scalable: z.boolean(),
    prepMinutes: z.number().int().min(0).max(600),
    cookMinutes: z.number().int().min(0).max(600),
    ingredients: z.array(recipeIngredientSchema).min(1),
    equipment: z.array(z.string().min(1)),
    steps: z
      .array(
        z.object({
          text: z.string().min(1),
          heat: z.enum(HEATS).optional(),
          ovenC: z.number().int().min(50).max(300).optional(),
        }),
      )
      .min(1),
    substitutions: z.array(
      z.object({ replaces: z.string().min(1), use: z.array(recipeIngredientSchema).min(1), note: z.string().optional() }),
    ),
    tips: z.array(z.string()),
    antiWaste: z.string().min(1),
    storage: z.string().nullable(),
    safety: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .superRefine((r, ctx) => {
    // Chaque ingrédient n'apparaît qu'une fois : évite de compter deux fois le même produit.
    const ids = r.ingredients.map((i) => i.ingredientId)
    const dup = ids.find((id, i) => ids.indexOf(id) !== i)
    if (dup) ctx.addIssue({ code: 'custom', path: ['ingredients'], message: `Ingrédient en double : ${dup}` })
    for (const s of r.substitutions) {
      if (!ids.includes(s.replaces)) {
        ctx.addIssue({ code: 'custom', path: ['substitutions'], message: `Remplacement d'un ingrédient absent : ${s.replaces}` })
      }
    }
  })

/**
 * Formulaire d'ajout / modification : champs bruts du formulaire (texte),
 * transformés en données propres avec des messages d'erreur en français.
 */
export const inventoryFormSchema = z
  .object({
    /** Ingrédient du catalogue choisi ('' = aucun). */
    ingredientId: z.string(),
    name: z.string().trim().min(1, 'Indiquez le nom de l’ingrédient.').max(80, 'Nom trop long (80 caractères maximum).'),
    category: z.enum(CATEGORIES, { message: 'Choisissez une catégorie.' }),
    quantity: z.string(),
    unit: z.enum(UNITS, { message: 'Choisissez une unité.' }),
    location: z.union([z.enum(LOCATIONS), z.literal('')]),
    status: z.enum(STATUSES, { message: 'Choisissez un état.' }),
    purchasedOn: z.string(),
    openedOn: z.string(),
    dateKind: z.union([z.enum(DATE_KINDS), z.literal('')]),
    date: z.string(),
    urgent: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const q = v.quantity.trim().replace(',', '.')
    if (q !== '' && !/^\d+(\.\d+)?$/.test(q)) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Saisissez un nombre positif, par exemple 250 ou 1,5.' })
    }
    for (const key of ['purchasedOn', 'openedOn', 'date'] as const) {
      if (v[key] && !isValidISODate(v[key])) ctx.addIssue({ code: 'custom', path: [key], message: 'Date invalide.' })
    }
    if (v.date && !v.dateKind) {
      ctx.addIssue({ code: 'custom', path: ['dateKind'], message: 'Précisez le type de date (DLC, DDM ou « je ne sais pas »).' })
    }
    if (v.dateKind && !v.date) {
      ctx.addIssue({ code: 'custom', path: ['date'], message: 'Indiquez la date figurant sur l’emballage.' })
    }
    if (v.purchasedOn && v.openedOn && v.openedOn < v.purchasedOn) {
      ctx.addIssue({ code: 'custom', path: ['openedOn'], message: 'La date d’ouverture ne peut pas précéder la date d’achat.' })
    }
  })
  .transform((v) => ({
    name: v.name,
    ingredientId: v.ingredientId || null,
    category: v.category,
    quantity: v.quantity.trim() === '' ? null : Number(v.quantity.trim().replace(',', '.')),
    unit: v.unit,
    location: v.location || null,
    status: v.status,
    purchasedOn: v.purchasedOn || null,
    openedOn: v.openedOn || null,
    dateLabel: v.dateKind && v.date ? { kind: v.dateKind, date: v.date } : null,
    urgent: v.urgent,
  }))

export type InventoryFormValues = z.input<typeof inventoryFormSchema>

/** Erreurs de validation regroupées par champ (premier message de chaque champ). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}
