import { Link, useParams } from 'react-router'
import { INGREDIENTS_BY_ID } from '../../data/ingredients'
import { RECIPES } from '../../data/recipes'
import { usePantry } from '../pantry/usePantry'
import { ExpiryBadge } from '../../ui/ExpiryBadge'
import { formatQuantity } from '../../domain/format'

export function RecipeDetailPage() {
  const { id } = useParams()
  const pantry = usePantry()
  const recipe = RECIPES.find((r) => r.id === id)

  if (!recipe) {
    return (
      <div className="empty">
        <p>Cette recette n'existe pas.</p>
        <Link to="/recettes">Retour aux recettes</Link>
      </div>
    )
  }

  return (
    <article className="recipe">
      <Link to="/recettes" className="back">
        ‹ Recettes
      </Link>
      <h1>{recipe.title}</h1>
      <p className="muted">{recipe.summary}</p>
      <p className="tags">
        <span className="tag">⏱ {recipe.minutes} min</span>
        <span className="tag">👥 {recipe.servings} pers.</span>
        {recipe.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </p>

      <h2>Ingrédients</h2>
      <ul className="ingredients">
        {recipe.ingredients.map((ri) => {
          const ing = INGREDIENTS_BY_ID.get(ri.ingredientId)
          const isBase = ing?.category === 'base'
          const items = pantry?.filter((p) => p.ingredientId === ri.ingredientId) ?? []
          const have = isBase || items.length > 0
          return (
            <li key={ri.ingredientId} className={have ? 'have' : 'missing'}>
              <span aria-label={have ? 'disponible' : 'manquant'}>{have ? '✓' : '○'}</span>
              <span className="ingredient-name">
                {ing?.name ?? ri.ingredientId}
                {ri.quantity !== undefined && <span className="muted"> · {formatQuantity(ri.quantity, ri.unit)}</span>}
                {ri.optional && <small className="muted"> (facultatif)</small>}
              </span>
              {items[0] && <ExpiryBadge date={items[0].expiresOn} />}
            </li>
          )
        })}
      </ul>

      <h2>Préparation</h2>
      <ol className="steps">
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </article>
  )
}
