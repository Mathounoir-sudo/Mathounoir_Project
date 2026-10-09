import { Link } from 'react-router'
import { ChevronRight, Clock, Leaf, Users } from 'lucide-react'
import type { Recipe } from '../../domain/types'
import { totalMinutes, type RecipeMatch } from '../../domain/matching'
import { ingredientLabel } from './labels'

export function RecipeCard({ recipe, match }: { recipe: Recipe; match?: RecipeMatch }) {
  return (
    <Link
      to={`/recettes/${recipe.id}`}
      className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold leading-snug">{recipe.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden="true" />
            {totalMinutes(recipe)} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden="true" />
            {recipe.servings} {recipe.servings > 1 ? 'portions' : 'portion'}
          </span>
        </p>
        {match ? <Availability match={match} /> : <p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.description}</p>}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  )
}

function Availability({ match }: { match: RecipeMatch }) {
  return (
    <div className="mt-2 space-y-1 text-sm">
      {match.feasible ? (
        match.unverified.length === 0 ? (
          <p className="font-semibold text-ok">Rien à acheter</p>
        ) : (
          <p className="font-semibold text-warn">
            Tout est là · quantité à vérifier : {match.unverified.map((l) => ingredientLabel(l.ingredient.ingredientId)).join(', ')}
          </p>
        )
      ) : (
        <p className="font-semibold text-accent">
          Manque :{' '}
          {match.missing
            .map((l) => ingredientLabel(l.ingredient.ingredientId) + (l.status === 'insufficient' ? ' (pas assez)' : ''))
            .join(', ')}
        </p>
      )}
      {match.usesPriority.length > 0 && (
        <p className="flex items-start gap-1 text-muted">
          <Leaf className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Utilise : {[...new Set(match.usesPriority.map((i) => i.name))].join(', ')}</span>
        </p>
      )}
    </div>
  )
}
