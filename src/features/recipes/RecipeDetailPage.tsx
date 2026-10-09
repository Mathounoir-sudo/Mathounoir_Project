import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Check, Circle, CircleHelp, Heart, Leaf, Lightbulb, Refrigerator, SearchX, ShieldAlert, TriangleAlert } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Card, SectionTitle } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../components/Toast'
import { useFavorites, useInventory, useStaples } from '../../hooks/useData'
import { matchRecipe, totalMinutes, type RecipeLine } from '../../domain/matching'
import { formatQuantity } from '../../domain/quantity'
import { CATALOG_BY_ID } from '../../data/catalog'
import { findRecipe, toggleFavorite } from '../../services/recipes'
import { ingredientLabel } from './labels'

export function RecipeDetailPage() {
  const { id } = useParams()
  const recipe = findRecipe(id)
  const inventory = useInventory()
  const staples = useStaples()
  const favorites = useFavorites()
  const toast = useToast()

  const match = useMemo(
    () => (recipe && inventory && staples ? matchRecipe(recipe, inventory, CATALOG_BY_ID, { staples }) : undefined),
    [recipe, inventory, staples],
  )

  if (!recipe) {
    return (
      <>
        <PageHeader title="Recette introuvable" back={{ to: '/recettes', label: 'Recettes' }} />
        <EmptyState icon={<SearchX className="size-7" />} title="Cette recette n’existe pas" actions={<ButtonLink to="/recettes">Voir les recettes</ButtonLink>} />
      </>
    )
  }

  const isFavorite = favorites?.includes(recipe.id) ?? false
  const toBuy = match?.missing ?? []

  return (
    <article>
      <PageHeader title={recipe.title} subtitle={recipe.description} back={{ to: '/recettes', label: 'Recettes' }} />

      <dl className="grid grid-cols-4 gap-2 text-center">
        {[
          ['Portions', String(recipe.servings)],
          ['Préparation', `${recipe.prepMinutes} min`],
          ['Cuisson', `${recipe.cookMinutes} min`],
          ['Total', `${totalMinutes(recipe)} min`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card px-1 py-3 ring-1 ring-line">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <Button
        variant={isFavorite ? 'primary' : 'secondary'}
        className="mt-4 w-full"
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

      {match && (
        <Card className={`mt-4 ${toBuy.length === 0 ? 'bg-ok-soft' : 'bg-accent-soft'} border-0`}>
          {toBuy.length === 0 ? (
            <p className="font-semibold text-ok">
              {match.unverified.length === 0
                ? 'Vous avez tous les ingrédients nécessaires.'
                : 'Tous les ingrédients sont présents, mais certaines quantités sont à vérifier.'}
            </p>
          ) : (
            <p className="font-semibold text-accent">
              À acheter : {toBuy.map((l) => ingredientLabel(l.ingredient.ingredientId)).join(', ')}
            </p>
          )}
          {match.usesPriority.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-sm">
              <Leaf className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Cette recette aide à utiliser : {[...new Set(match.usesPriority.map((i) => i.name))].join(', ')}.
            </p>
          )}
        </Card>
      )}

      <SectionTitle>Ingrédients</SectionTitle>
      <p className="-mt-2 mb-2 text-sm text-muted">Pour {recipe.servings} {recipe.servings > 1 ? 'portions' : 'portion'}.</p>
      <ul className="divide-y divide-line rounded-3xl border border-line bg-card px-4">
        {(match?.lines ?? recipe.ingredients.map((ingredient) => ({ ingredient, status: 'missing', items: [], have: null }) as RecipeLine)).map((line) => (
          <IngredientLine key={line.ingredient.ingredientId} line={line} known={match !== undefined} />
        ))}
      </ul>

      {recipe.substitutions.length > 0 && (
        <>
          <SectionTitle>Remplacements possibles</SectionTitle>
          <ul className="space-y-2">
            {recipe.substitutions.map((s) => (
              <li key={s} className="flex items-start gap-2 text-[15px]">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                {s}
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
            <p className="pt-1 text-[15px] leading-relaxed">
              <span className="sr-only">Étape {i + 1} : </span>
              {step}
            </p>
          </li>
        ))}
      </ol>

      {recipe.safety.length > 0 && (
        <Card className="mt-6 border-warn/40 bg-warn-soft">
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
        Recette de démonstration rédigée pour Mijoté. Aucune valeur nutritionnelle n’est fournie. Le réglage du nombre de
        portions et le mode cuisine arriveront dans une prochaine version.
      </p>
    </article>
  )
}

function IngredientLine({ line, known }: { line: RecipeLine; known: boolean }) {
  const { ingredient, status, have } = line
  const qty = formatQuantity(ingredient.quantity, ingredient.unit)
  const isStaple = CATALOG_BY_ID.get(ingredient.ingredientId)?.category === 'staple'

  let icon = <Circle className="size-5 text-muted" aria-hidden="true" />
  let note = ingredient.optional ? 'Facultatif' : 'À acheter'
  let label = ingredient.optional ? 'facultatif, absent' : 'absent'
  if (!known) {
    note = ingredient.optional ? 'Facultatif' : ''
    label = ''
  } else if (status === 'available') {
    icon = <Check className="size-5 text-ok" aria-hidden="true" />
    note = isStaple && line.items.length === 0 ? 'Basique confirmé' : 'Disponible'
    label = 'disponible'
  } else if (status === 'insufficient') {
    icon = <TriangleAlert className="size-5 text-accent" aria-hidden="true" />
    note = `Pas assez : vous avez ${formatQuantity(have, ingredient.unit)}`
    label = 'quantité insuffisante'
  } else if (status === 'unverified') {
    icon = <CircleHelp className="size-5 text-warn" aria-hidden="true" />
    note = 'Présent, quantité à vérifier'
    label = 'présent, quantité à vérifier'
  } else if (isStaple && !ingredient.optional) {
    note = 'Basique non confirmé'
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="shrink-0" role={label ? 'img' : undefined} aria-label={label || undefined}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {CATALOG_BY_ID.get(ingredient.ingredientId)?.name ?? ingredient.ingredientId}
          {ingredient.note && <span className="font-normal text-muted"> — {ingredient.note}</span>}
        </span>
        {note && <span className="block text-sm text-muted">{note}</span>}
      </span>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{qty}</span>
    </li>
  )
}
