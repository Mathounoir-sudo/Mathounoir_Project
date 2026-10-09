import { useParams } from 'react-router'
import {
  ArrowRightLeft,
  Check,
  Circle,
  CircleHelp,
  CookingPot,
  Flame,
  Heart,
  Leaf,
  Lightbulb,
  Refrigerator,
  SearchX,
  ShieldAlert,
  TriangleAlert,
  Utensils,
} from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Button, ButtonLink } from '../../components/Button'
import { Card, SectionTitle } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { ServingsSelector } from '../../components/ServingsSelector'
import { useToast } from '../../components/Toast'
import { useFavorites, useServings } from '../../hooks/useData'
import { useRecipeEvaluation } from '../../hooks/useRecipeEngine'
import { scaleIngredient, type LineEvaluation } from '../../domain/recipe-engine'
import { formatQuantity } from '../../domain/quantity'
import type { Recipe, RecipeStep } from '../../domain/types'
import { CATALOG_BY_ID } from '../../data/catalog'
import { findRecipe, toggleFavorite } from '../../services/recipes'
import { setServings } from '../../services/preferences'
import { FEASIBILITY, ingredientLabel } from './labels'

export function RecipeDetailPage() {
  const { id } = useParams()
  const recipe = findRecipe(id)
  const servings = useServings()
  const result = useRecipeEvaluation(recipe, servings)
  const favorites = useFavorites()
  const toast = useToast()

  if (!recipe) {
    return (
      <>
        <PageHeader title="Recette introuvable" back={{ to: '/recettes', label: 'Recettes' }} />
        <EmptyState icon={<SearchX className="size-7" />} title="Cette recette n’existe pas" actions={<ButtonLink to="/recettes">Voir les recettes</ButtonLink>} />
      </>
    )
  }
  if (!result || servings === undefined) return <div aria-busy="true" />

  const e = result.evaluation
  const isFavorite = favorites?.includes(recipe.id) ?? false
  const status = FEASIBILITY[e.feasibility]

  return (
    <article>
      <PageHeader title={recipe.title} subtitle={recipe.description} back={{ to: '/recettes', label: 'Recettes' }} />

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ['Portions', String(e.servings)],
          ['Préparation', `${recipe.prepMinutes} min`],
          ['Cuisson', `${recipe.cookMinutes} min`],
          ['Total', `${e.totalMinutes} min`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card px-1 py-3 ring-1 ring-line">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-3">
        <ServingsSelector
          value={servings}
          lockedAt={recipe.scalable ? undefined : recipe.servings}
          onChange={(n) => void toast.run(() => setServings(n))}
        />
        <ButtonLink to={`/recettes/${recipe.id}/preparer`} size="lg" className="w-full" icon={<CookingPot className="size-5" aria-hidden="true" />}>
          Je cuisine cette recette
        </ButtonLink>
        <Button
          variant={isFavorite ? 'primary' : 'secondary'}
          className="w-full"
          aria-pressed={isFavorite}
          icon={<Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />}
          onClick={() =>
            void toast.run(async () => {
              const now = await toggleFavorite(recipe.id)
              toast.success(now ? 'Recette enregistrée.' : 'Recette retirée de vos enregistrements.')
            })
          }
        >
          {isFavorite ? 'Enregistrée' : 'Enregistrer'}
        </Button>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">Avec votre inventaire</p>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {result.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Card>

      <SectionTitle>Ingrédients</SectionTitle>
      <p className="-mt-2 mb-2 text-sm text-muted">
        Pour {e.servings} {e.servings > 1 ? 'portions' : 'portion'}
        {recipe.scalable && e.servings !== recipe.servings && ` (recette de base : ${recipe.servings})`}.
      </p>
      <ul aria-label="Ingrédients de la recette" className="divide-y divide-line rounded-3xl border border-line bg-card px-4">
        {e.lines.map((line) => (
          <IngredientLine key={line.ingredientId} line={line} />
        ))}
      </ul>

      {recipe.equipment.length > 0 && (
        <>
          <SectionTitle>Matériel</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {recipe.equipment.map((eq) => (
              <li key={eq} className="inline-flex items-center gap-1.5 rounded-full bg-line/50 px-3 py-1.5 text-sm">
                <Utensils className="size-3.5 text-muted" aria-hidden="true" />
                {eq}
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle>Préparation</SectionTitle>
      <ol className="space-y-4">
        {recipe.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary" aria-hidden="true">
              {i + 1}
            </span>
            <div className="pt-1">
              <p className="text-[15px] leading-relaxed">
                <span className="sr-only">Étape {i + 1} : </span>
                {step.text}
              </p>
              <HeatBadge step={step} />
            </div>
          </li>
        ))}
      </ol>

      <Substitutions recipe={recipe} servings={e.servings} />

      {recipe.tips.length > 0 && (
        <>
          <SectionTitle>Astuces</SectionTitle>
          <ul className="space-y-2">
            {recipe.tips.map((t) => (
              <li key={t} className="flex items-start gap-2 text-[15px]">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </>
      )}

      <Card className="mt-6 border-0 bg-primary-soft">
        <p className="flex items-center gap-2 font-semibold text-primary">
          <Leaf className="size-5" aria-hidden="true" />
          Intérêt anti-gaspi
        </p>
        <p className="mt-1 text-sm">{recipe.antiWaste}</p>
      </Card>

      {recipe.safety.length > 0 && (
        <Card className="mt-4 border-warn/40 bg-warn-soft">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <ShieldAlert className="size-5" aria-hidden="true" />
            Sécurité alimentaire
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {recipe.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      )}

      {recipe.storage && (
        <Card className="mt-4">
          <p className="flex items-center gap-2 font-semibold">
            <Refrigerator className="size-5 text-primary" aria-hidden="true" />
            Conservation
          </p>
          <p className="mt-1 text-sm">{recipe.storage}</p>
        </Card>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Recette de démonstration rédigée pour Mijoté. Aucune valeur nutritionnelle n’est fournie. Changer le nombre de
        portions ne modifie pas votre inventaire.
      </p>
      <ButtonLink to="/recettes" variant="secondary" className="mt-4 w-full">
        Retour aux recettes
      </ButtonLink>
    </article>
  )
}

function HeatBadge({ step }: { step: RecipeStep }) {
  if (!step.heat && !step.ovenC) return null
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
      {step.ovenC ? <CookingPot className="size-3.5" aria-hidden="true" /> : <Flame className="size-3.5" aria-hidden="true" />}
      {step.ovenC ? `Four ${step.ovenC} °C` : step.heat!.charAt(0).toUpperCase() + step.heat!.slice(1)}
    </span>
  )
}

function Substitutions({ recipe, servings }: { recipe: Recipe; servings: number }) {
  if (recipe.substitutions.length === 0) return null
  return (
    <>
      <SectionTitle>Remplacements possibles</SectionTitle>
      <ul className="space-y-2">
        {recipe.substitutions.map((s) => {
          const replaced = recipe.ingredients.find((i) => i.ingredientId === s.replaces)!
          const scaled = scaleIngredient(replaced, recipe.servings, servings)
          return (
            <li key={s.replaces} className="flex items-start gap-2 text-[15px]">
              <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                {CATALOG_BY_ID.get(s.replaces)?.name} ({formatQuantity(scaled.quantity, scaled.unit)}) →{' '}
                {s.use
                  .map((u) => {
                    const su = scaleIngredient(u, recipe.servings, servings)
                    return `${ingredientLabel(u.ingredientId)} (${formatQuantity(su.quantity, su.unit)})`
                  })
                  .join(' + ')}
                {s.note && <span className="text-muted"> — {s.note}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function IngredientLine({ line }: { line: LineEvaluation }) {
  const qty = formatQuantity(line.quantity, line.unit)
  const haveText = line.have !== null && line.unit ? `vous avez ${formatQuantity(line.have, line.unit)}` : null

  let icon = <Circle className="size-5 text-muted" aria-hidden="true" />
  let label = 'manquant'
  let note = line.optional ? 'Facultatif, absent' : 'À acheter'
  switch (line.status) {
    case 'available':
      icon = <Check className="size-5 text-ok" aria-hidden="true" />
      label = 'disponible'
      note = line.source === 'staple' ? 'Basique confirmé par vous' : haveText ? `Disponible : ${haveText}` : 'Disponible'
      break
    case 'substituted':
      icon = <ArrowRightLeft className="size-5 text-ok" aria-hidden="true" />
      label = 'remplacé'
      note = `Remplacé par ${line.substitution!.lines.map((s) => `${s.name.toLocaleLowerCase('fr-FR')} (${formatQuantity(s.quantity, s.unit)})`).join(' + ')}${line.substitution!.note ? ` — ${line.substitution!.note}` : ''}`
      break
    case 'insufficient':
      icon = <TriangleAlert className="size-5 text-accent" aria-hidden="true" />
      label = 'quantité insuffisante'
      note = `Pas assez : ${haveText ?? 'quantité insuffisante'}${line.shortfall !== null ? `, il manque ${formatQuantity(line.shortfall, line.unit)}` : ''}`
      break
    case 'uncertain':
      icon = <CircleHelp className="size-5 text-warn" aria-hidden="true" />
      label = 'à confirmer'
      note = line.uncertainty.includes('probable-match')
        ? `À confirmer : « ${line.items.map((i) => i.name).join(' », « ')} » correspond-il à cet ingrédient ? Vérifiez-le dans l’inventaire.`
        : line.uncertainty.includes('unit-incompatible')
          ? `À confirmer : vos quantités sont dans une autre unité (${[...new Set(line.items.map((i) => i.unit))].join(', ')})`
          : 'À confirmer : quantité non renseignée dans l’inventaire'
      break
    default:
      if (!line.optional && CATALOG_BY_ID.get(line.ingredientId)?.category === 'staple') note = 'Basique non confirmé : à acheter ou à cocher dans l’inventaire'
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 shrink-0" role="img" aria-label={label}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {line.name}
          {line.note && <span className="font-normal text-muted"> — {line.note}</span>}
          {line.optional && line.status !== 'missing' && <span className="font-normal text-muted"> (facultatif)</span>}
        </span>
        <span className="block text-sm text-muted">{note}</span>
        {line.unusable
          .filter((u) => u.reason !== 'empty')
          .map(({ item, reason }) => (
            <span key={item.id} className="mt-1 block text-sm font-medium text-danger">
              {item.name} n’est pas utilisé : {reason === 'use-by-expired' ? 'DLC dépassée, ne pas consommer' : 'date dépassée à vérifier sur l’étiquette'}.
            </span>
          ))}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{qty}</span>
    </li>
  )
}
