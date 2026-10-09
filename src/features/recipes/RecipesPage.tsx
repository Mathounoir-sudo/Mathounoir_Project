import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { INGREDIENTS_BY_ID } from '../../data/ingredients'
import { RECIPES } from '../../data/recipes'
import { matchRecipes, type RecipeMatch } from '../../domain/matching'
import type { Recipe } from '../../domain/types'
import { PageHeader } from '../../ui/PageHeader'
import { usePantry } from '../pantry/usePantry'

const ingredientName = (id: string) => INGREDIENTS_BY_ID.get(id)?.name.toLowerCase() ?? id

export function RecipesPage() {
  const pantry = usePantry()
  const [tab, setTab] = useState<'suggestions' | 'toutes'>('suggestions')
  const matches = useMemo(() => (pantry ? matchRecipes(RECIPES, pantry, INGREDIENTS_BY_ID) : []), [pantry])

  return (
    <>
      <PageHeader title="Recettes" subtitle="Que cuisiner avec ce que j'ai ?" />
      <div className="chips filter" role="tablist">
        <button role="tab" aria-selected={tab === 'suggestions'} className={`chip ${tab === 'suggestions' ? 'chip-active' : ''}`} onClick={() => setTab('suggestions')}>
          Suggestions
        </button>
        <button role="tab" aria-selected={tab === 'toutes'} className={`chip ${tab === 'toutes' ? 'chip-active' : ''}`} onClick={() => setTab('toutes')}>
          Toutes ({RECIPES.length})
        </button>
      </div>

      {tab === 'suggestions' && pantry !== undefined && matches.length === 0 && (
        <div className="empty">
          <p className="empty-icon" aria-hidden="true">
            🍲
          </p>
          <p>Aucune suggestion pour l'instant.</p>
          <p className="muted">
            Ajoutez des produits dans votre <Link to="/">garde-manger</Link> pour voir les recettes qui les utilisent.
          </p>
        </div>
      )}

      <ul className="list">
        {tab === 'suggestions'
          ? matches.map((m) => <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />)
          : RECIPES.map((r) => <RecipeCard key={r.id} recipe={r} />)}
      </ul>
    </>
  )
}

function RecipeCard({ recipe, match }: { recipe: Recipe; match?: RecipeMatch }) {
  return (
    <li>
      <Link to={`/recettes/${recipe.id}`} className="list-item recipe-card">
        <span className="list-item-main">
          <strong>{recipe.title}</strong>
          <small className="muted">
            {recipe.minutes} min · {recipe.servings} pers.
          </small>
          {match && (
            <small>
              {match.canCook ? (
                <span className="ok-text">✓ Vous avez tout</span>
              ) : (
                <span className="warn-text">Manque : {match.missing.map(ingredientName).join(', ')}</span>
              )}
              <br />
              <span className="muted">Utilise : {[...new Set(match.used.map((i) => i.name))].join(', ')}</span>
            </small>
          )}
        </span>
        <span aria-hidden="true" className="chevron">
          ›
        </span>
      </Link>
    </li>
  )
}
