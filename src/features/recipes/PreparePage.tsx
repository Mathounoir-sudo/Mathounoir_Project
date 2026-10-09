import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { CircleCheck, CookingPot, Minus, Plus, SearchX } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button, ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { describedBy, inputClasses } from '../../components/Field'
import { PageHeader } from '../../components/PageHeader'
import { ServingsSelector } from '../../components/ServingsSelector'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import { useServings } from '../../hooks/useData'
import { useRecipeEvaluation, useStock } from '../../hooks/useRecipeEngine'
import { db } from '../../lib/db'
import type { LineEvaluation, RecipeEvaluation } from '../../domain/recipe-engine'
import { suggestUses, validatePortions, validateUses, type StockState, type UseMode, type UsePlan } from '../../domain/preparation'
import { formatQuantity, parseQuantity } from '../../domain/quantity'
import { fieldErrors, leftoverFormSchema, type LeftoverFormValues } from '../../domain/schemas'
import { todayISO } from '../../domain/dates'
import type { Preparation, Recipe } from '../../domain/types'
import { findRecipe } from '../../services/recipes'
import { recordPreparation } from '../../services/preparations'
import { LeftoverFields } from '../leftovers/LeftoverFields'
import { FEASIBILITY } from './labels'

/** /recettes/:id/preparer → nouvelle préparation avec un identifiant unique dans l'adresse (anti-doublon). */
export function PrepareRedirect() {
  const { id } = useParams()
  const [prepId] = useState(() => crypto.randomUUID())
  return <Navigate to={`/recettes/${id}/preparer/${prepId}`} replace />
}

export function PreparePage() {
  const { id, prepId } = useParams()
  const recipe = findRecipe(id)
  // [x] : distingue « chargement » (undefined) de « aucune préparation enregistrée » ([undefined]).
  const existing = useLiveQuery(async () => [prepId ? await db.preparations.get(prepId) : undefined], [prepId])

  if (!recipe || !prepId) {
    return (
      <>
        <PageHeader title="Recette introuvable" back={{ to: '/recettes', label: 'Recettes' }} />
        <EmptyState icon={<SearchX className="size-7" />} title="Cette recette n’existe pas" actions={<ButtonLink to="/recettes">Voir les recettes</ButtonLink>} />
      </>
    )
  }
  if (existing === undefined) return <div aria-busy="true" />
  const [done] = existing
  if (done) return <PreparationDone preparation={done} recipe={recipe} />
  return <PrepareForm recipe={recipe} prepId={prepId} />
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

/** Copie d'un objet sans une clé (pour effacer l'erreur d'un champ). */
function without<T extends Record<string, unknown>>(obj: T, key: string): T {
  const next = { ...obj }
  delete next[key]
  return next
}

function defaultLeftover(recipe: Recipe, portions: number): LeftoverFormValues {
  return {
    name: `Reste : ${recipe.title}`,
    ingredientId: recipe.yields ?? '',
    quantity: portions > 0 ? String(portions) : '',
    unit: 'portion',
    preparedOn: todayISO(),
    limitKind: '',
    limitDate: '',
    note: '',
  }
}

function PrepareForm({ recipe, prepId }: { recipe: Recipe; prepId: string }) {
  const toast = useToast()
  const preferred = useServings()
  const stockData = useStock()
  const [servings, setServings] = useState<number | null>(null)
  const effectiveServings = recipe.scalable ? (servings ?? preferred) : recipe.servings
  const result = useRecipeEvaluation(recipe, effectiveServings)

  // Quantités proposées : recalculées seulement quand le nombre de portions change, jamais pendant la saisie.
  const [plans, setPlans] = useState<UsePlan[] | null>(null)
  const [plansFor, setPlansFor] = useState<number | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  if (result && stockData && effectiveServings !== undefined && plansFor !== effectiveServings) {
    const suggested = suggestUses(result.evaluation, (sid) => (stockData.leftoverIds.has(sid) ? 'leftover' : 'inventory'))
    setPlans(suggested)
    setAmounts(Object.fromEntries(suggested.map((p) => [p.stockId, p.quantity === null ? '' : String(p.quantity).replace('.', ',')])))
    setPlansFor(effectiveServings)
  }

  const [eaten, setEaten] = useState<number | null>(null)
  const [keepLeftover, setKeepLeftover] = useState(true)
  const [leftover, setLeftover] = useState<LeftoverFormValues | null>(null)
  const leftoverQtyTouched = useRef(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [leftoverErrors, setLeftoverErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const stockMap = useMemo(() => {
    const m = new Map<string, StockState>()
    for (const s of stockData?.stock ?? []) m.set(s.id, { quantity: s.quantity, unit: s.unit, name: s.name })
    return m
  }, [stockData])

  if (!result || !plans || !stockData || effectiveServings === undefined) return <div aria-busy="true" />
  const e = result.evaluation
  // Jamais plus de portions mangées que de portions préparées (si l'on réduit les portions ensuite).
  const eatenNow = Math.min(eaten ?? effectiveServings, effectiveServings)
  const remaining = Math.max(0, effectiveServings - eatenNow)
  const leftoverValues = leftover ?? defaultLeftover(recipe, remaining)

  const setEatenAndDefault = (n: number) => {
    const next = Math.min(effectiveServings, Math.max(0, n))
    setEaten(next)
    // Tant que l'utilisateur n'a pas saisi la quantité du reste, elle suit les portions restantes.
    if (!leftoverQtyTouched.current) setLeftover({ ...leftoverValues, quantity: effectiveServings - next > 0 ? String(effectiveServings - next) : '' })
  }

  const setPlan = (stockId: string, patch: Partial<UsePlan>) => {
    setPlans((ps) => ps!.map((p) => (p.stockId === stockId ? { ...p, ...patch } : p)))
    setErrors((errs) => without(errs, stockId))
  }

  async function onSave() {
    // Quantités saisies (texte) → nombres.
    const finalPlans = plans!.map((p) => (p.mode === 'amount' ? { ...p, quantity: parseQuantity(amounts[p.stockId] ?? '') } : p))
    const useErrors = validateUses(finalPlans, stockMap)
    const portionsError = validatePortions(effectiveServings!, eatenNow)
    let parsedLeftover = null
    let lErrors: Record<string, string> = {}
    if (keepLeftover && remaining > 0) {
      const parsed = leftoverFormSchema.safeParse(leftoverValues)
      if (!parsed.success) lErrors = fieldErrors(parsed.error)
      else if (parsed.data.quantity === null) lErrors = { quantity: 'Indiquez la quantité ou le nombre de portions conservées.' }
      else parsedLeftover = parsed.data
    }
    setErrors({ ...useErrors, ...(portionsError ? { portions: portionsError } : {}) })
    setLeftoverErrors(lErrors)
    if (Object.keys(useErrors).length > 0 || portionsError || Object.keys(lErrors).length > 0) {
      toast.error('Certaines informations sont à corriger avant d’enregistrer : rien n’a été modifié.')
      return
    }
    setSaving(true)
    const r = await toast.run(() =>
      recordPreparation({
        id: prepId,
        recipe,
        servings: effectiveServings!,
        eatenServings: eatenNow,
        uses: finalPlans,
        leftover: parsedLeftover,
      }),
    )
    setSaving(false)
    if (r?.status === 'recorded') toast.success('Préparation enregistrée.')
    if (r?.status === 'already-recorded') toast.success('Cette préparation était déjà enregistrée : rien n’a été déduit une seconde fois.')
  }

  return (
    <>
      <PageHeader title={`Je cuisine : ${recipe.title}`} back={{ to: `/recettes/${recipe.id}`, label: 'Recette' }} />
      <p className="-mt-3 mb-4 text-sm text-muted">
        Rien n’est déduit de votre inventaire tant que vous n’avez pas vérifié les quantités et enregistré.
      </p>

      <section aria-labelledby="step-portions">
        <h2 id="step-portions" className="mb-2 text-lg font-semibold">
          1. Portions préparées
        </h2>
        <ServingsSelector value={effectiveServings} lockedAt={recipe.scalable ? undefined : recipe.servings} onChange={(n) => setServings(n)} />
      </section>

      <section aria-labelledby="step-needs" className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="step-needs" className="text-lg font-semibold">
            2. Ingrédients nécessaires
          </h2>
          <Badge tone={FEASIBILITY[e.feasibility].tone}>{FEASIBILITY[e.feasibility].label}</Badge>
        </div>
        <NeedsList evaluation={e} />
      </section>

      <section aria-labelledby="step-used" className="mt-6">
        <h2 id="step-used" className="mb-1 text-lg font-semibold">
          3. Ce que vous avez réellement utilisé
        </h2>
        <p className="mb-2 text-sm text-muted">Vérifiez chaque quantité : elle sera retirée de votre inventaire ou de vos restes.</p>
        {plans.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Aucun produit de votre inventaire n’est concerné : rien ne sera déduit.</p>
          </Card>
        ) : (
          <ul className="space-y-2" aria-label="Quantités utilisées">
            {plans.map((p) => (
              <UseRow
                key={p.stockId}
                plan={p}
                amount={amounts[p.stockId] ?? ''}
                error={errors[p.stockId]}
                onMode={(mode) => setPlan(p.stockId, { mode })}
                onAmount={(text) => {
                  setAmounts((a) => ({ ...a, [p.stockId]: text }))
                  setPlan(p.stockId, { mode: 'amount' })
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="step-after" className="mt-6">
        <h2 id="step-after" className="mb-2 text-lg font-semibold">
          4. Après le repas
        </h2>
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3" role="group" aria-label="Portions mangées maintenant">
            <span>
              <span className="block font-semibold">Portions mangées maintenant</span>
              <span className="block text-sm text-muted">
                Il reste {remaining} portion{remaining > 1 ? 's' : ''} sur {effectiveServings}.
              </span>
            </span>
            <span className="flex items-center gap-2">
              <button type="button" className="flex size-11 items-center justify-center rounded-full border border-line text-primary disabled:opacity-40" disabled={eatenNow <= 0} onClick={() => setEatenAndDefault(eatenNow - 1)} aria-label="Une portion mangée de moins">
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <span className="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">
                {eatenNow}
              </span>
              <button type="button" className="flex size-11 items-center justify-center rounded-full border border-line text-primary disabled:opacity-40" disabled={eatenNow >= effectiveServings} onClick={() => setEatenAndDefault(eatenNow + 1)} aria-label="Une portion mangée de plus">
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </span>
          </div>
          {errors.portions && (
            <p role="alert" className="text-sm font-medium text-danger">
              {errors.portions}
            </p>
          )}
          {remaining > 0 && (
            <>
              <Toggle id="keep-leftover" checked={keepLeftover} onChange={setKeepLeftover} label="Garder les restes" description="Ils apparaîtront dans « Mes restes »." />
              {keepLeftover && (
                <div className="rounded-2xl border border-line p-3">
                  <LeftoverFields
                    idPrefix="prep-leftover"
                    values={leftoverValues}
                    errors={leftoverErrors}
                    set={(key, value) => {
                      if (key === 'quantity' || key === 'unit') leftoverQtyTouched.current = true
                      setLeftover({ ...leftoverValues, [key]: value })
                      setLeftoverErrors((errs) => without(errs, key))
                    }}
                  />
                  <p className="mt-3 text-sm text-muted">
                    Le poids d’un plat cuit dépend de la cuisson : Mijoté ne le calcule pas, indiquez ce que vous gardez.
                  </p>
                </div>
              )}
            </>
          )}
        </Card>
      </section>

      <Button size="lg" className="mt-6 w-full" disabled={saving} onClick={() => void onSave()} icon={<CookingPot className="size-5" aria-hidden="true" />}>
        {saving ? 'Enregistrement…' : 'Enregistrer la préparation'}
      </Button>
      <ButtonLink to={`/recettes/${recipe.id}`} variant="ghost" className="mt-2 w-full">
        Annuler
      </ButtonLink>
    </>
  )
}

/** État d'une ligne, en quelques mots. */
function needStatus(l: LineEvaluation): string {
  switch (l.status) {
    case 'available':
      return l.source === 'staple' ? 'basique confirmé (non suivi)' : 'disponible'
    case 'substituted':
      return 'remplacé'
    case 'insufficient':
      return l.shortfall !== null ? `il manque ${formatQuantity(l.shortfall, l.unit)}` : 'pas assez'
    case 'uncertain':
      return l.uncertainty.includes('probable-match')
        ? 'correspondance à confirmer'
        : l.uncertainty.includes('unit-incompatible')
          ? 'unités différentes'
          : 'quantité inconnue'
    default:
      return l.optional ? 'facultatif, absent' : 'à acheter'
  }
}

function NeedsList({ evaluation: e }: { evaluation: RecipeEvaluation }) {
  return (
    <ul className="divide-y divide-line rounded-3xl border border-line bg-card px-4 text-sm" aria-label="Ingrédients nécessaires">
      {e.lines.map((l) => {
        const tone =
          l.status === 'available' || l.status === 'substituted' ? 'text-ok' : l.status === 'uncertain' ? 'text-warn' : l.optional ? 'text-muted' : 'text-accent'
        const status = needStatus(l)
        return (
          <li key={l.ingredientId} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="font-medium">{l.name}</span> <span className={tone}>· {status}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatQuantity(l.quantity, l.unit)}</span>
          </li>
        )
      })}
    </ul>
  )
}

const MODES: { value: UseMode; label: string }[] = [
  { value: 'amount', label: 'Déduire' },
  { value: 'finish', label: 'Il n’en reste plus' },
  { value: 'none', label: 'Ne rien déduire' },
]

function UseRow({
  plan: p,
  amount,
  error,
  onMode,
  onAmount,
}: {
  plan: UsePlan
  amount: string
  error?: string
  onMode: (m: UseMode) => void
  onAmount: (text: string) => void
}) {
  const inputId = `use-${p.stockId}`
  const unknown = p.available === null
  return (
    <li className={`rounded-3xl border bg-card p-4 ${error ? 'border-danger/50' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">
          {p.name} {p.stockKind === 'leftover' && <Badge tone="primary">Reste</Badge>}
        </p>
        <span className="shrink-0 text-sm text-muted">En stock : {unknown ? 'quantité inconnue' : formatQuantity(p.available, p.unit)}</span>
      </div>
      {p.note && <p className="mt-1 text-sm text-muted">{p.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Que faire avec ${p.name} ?`}>
        {MODES.map((m) => {
          const disabled = m.value === 'amount' && unknown
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={p.mode === m.value}
              disabled={disabled}
              onClick={() => onMode(m.value)}
              className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:opacity-40 ${
                p.mode === m.value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-ink hover:bg-primary-soft'
              }`}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      {unknown && <p className="mt-2 text-sm text-muted">Quantité inconnue dans l’inventaire : impossible d’en retirer une quantité précise.</p>}
      {p.mode === 'amount' && !unknown && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={inputId} className="text-sm font-semibold">
            Quantité utilisée
          </label>
          <input
            {...describedBy(inputId, error)}
            className={`${inputClasses} max-w-28`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
          />
          <span className="text-sm">{p.unit}</span>
        </div>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </li>
  )
}

// ─── Préparation enregistrée ─────────────────────────────────────────────────

function PreparationDone({ preparation: p, recipe }: { preparation: Preparation; recipe: Recipe }) {
  return (
    <>
      <PageHeader title="Préparation enregistrée" back={{ to: `/recettes/${recipe.id}`, label: 'Recette' }} />
      <Card className="border-0 bg-ok-soft">
        <p className="flex items-center gap-2 font-semibold text-ok">
          <CircleCheck className="size-5" aria-hidden="true" />
          {p.recipeTitle} : {p.servings} portion{p.servings > 1 ? 's' : ''} préparée{p.servings > 1 ? 's' : ''}, {p.eatenServings} mangée
          {p.eatenServings > 1 ? 's' : ''}.
        </p>
        <p className="mt-1 text-sm">Cette préparation est enregistrée une seule fois : recharger cette page ne déduit rien de plus.</p>
      </Card>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Retiré de votre inventaire</h2>
      {p.deductions.length === 0 ? (
        <p className="text-sm text-muted">Rien n’a été déduit.</p>
      ) : (
        <ul className="divide-y divide-line rounded-3xl border border-line bg-card px-4 text-sm" aria-label="Quantités déduites">
          {p.deductions.map((d) => (
            <li key={d.stockId} className="flex justify-between gap-3 py-2.5">
              <span>
                {d.name}
                {d.stockKind === 'leftover' && ' (reste)'}
              </span>
              <span className="font-semibold">
                {d.quantity === null ? 'il n’en reste plus' : `− ${formatQuantity(d.quantity, d.unit)}`}
                {d.finished && d.quantity !== null && ' · épuisé'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-2">
        {p.leftoverId && (
          <ButtonLink to={`/inventaire/restes/${p.leftoverId}`} icon={<CookingPot className="size-4" aria-hidden="true" />}>
            Voir le reste enregistré
          </ButtonLink>
        )}
        <ButtonLink to="/inventaire/restes" variant="secondary">
          Mes restes
        </ButtonLink>
        <Link to="/recettes" className="py-2 text-center font-semibold text-primary">
          Retour aux recettes
        </Link>
      </div>
    </>
  )
}
