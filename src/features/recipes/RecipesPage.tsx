import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, ChefHat, Heart, Info, Plus } from 'lucide-react'
import { ButtonLink } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { Segmented } from '../../components/Segmented'
import { Toggle } from '../../components/Toggle'
import { useFavorites, useInventory, useStaples } from '../../hooks/useData'
import { suggestRecipes } from '../../domain/matching'
import { CATALOG_BY_ID } from '../../data/catalog'
import { RECIPE_CATALOG, findRecipe } from '../../services/recipes'
import { RecipeCard } from './RecipeCard'

type Tab = 'suggestions' | 'all' | 'saved'

export function RecipesPage() {
  const inventory = useInventory()
  const staples = useStaples()
  const favorites = useFavorites()
  const [tab, setTab] = useState<Tab>('suggestions')
  const [strict, setStrict] = useState(false)

  const matches = useMemo(
    () => (inventory && staples ? suggestRecipes(RECIPE_CATALOG.recipes, inventory, CATALOG_BY_ID, { staples, strict }) : undefined),
    [inventory, staples, strict],
  )
  const saved = (favorites ?? []).map(findRecipe).filter((r) => r !== undefined)

  return (
    <>
      <PageHeader title="Mes recettes" subtitle="Que cuisiner avec ce que j’ai ?" />
      <Segmented
        label="Afficher"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'suggestions', label: 'Pour moi' },
          { value: 'all', label: `Toutes (${RECIPE_CATALOG.recipes.length})` },
          { value: 'saved', label: 'Enregistrées' },
        ]}
      />
      <p className="mt-3 flex items-start gap-2 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Recettes de démonstration. La génération de recettes par IA n’est pas encore activée.
      </p>

      {tab === 'suggestions' && (
        <>
          <div className="mt-3 rounded-3xl border border-line bg-card px-4 py-2">
            <Toggle
              id="strict"
              checked={strict}
              onChange={setStrict}
              label="Uniquement avec ce que j’ai"
              description="Masque les recettes qui demandent des courses."
            />
          </div>
          {staples?.size === 0 && inventory && inventory.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Astuce : confirmez vos basiques (sel, huile…) dans{' '}
              <Link to="/inventaire" className="font-semibold text-primary underline">
                l’inventaire
              </Link>{' '}
              pour des suggestions plus justes.
            </p>
          )}
          <div className="mt-4 space-y-2">
            {matches === undefined ? null : inventory?.length === 0 ? (
              <EmptyState
                icon={<ChefHat className="size-7" />}
                title="Ajoutez d’abord vos ingrédients"
                actions={
                  <ButtonLink to="/inventaire/nouveau" icon={<Plus className="size-4" aria-hidden="true" />}>
                    Ajouter un ingrédient
                  </ButtonLink>
                }
              >
                Les suggestions sont calculées à partir de ce que vous avez réellement.
              </EmptyState>
            ) : matches.length === 0 ? (
              <EmptyState icon={<ChefHat className="size-7" />} title={strict ? 'Aucune recette sans courses' : 'Aucune recette correspondante'}>
                {strict
                  ? 'Aucune recette de démonstration n’est réalisable uniquement avec votre inventaire. Désactivez le filtre pour voir ce qu’il manque.'
                  : 'Aucune recette de démonstration n’utilise vos ingrédients. Consultez l’onglet « Toutes ».'}
              </EmptyState>
            ) : (
              matches.map((m) => <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />)
            )}
          </div>
        </>
      )}

      {tab === 'all' && (
        <div className="mt-4 space-y-2">
          {RECIPE_CATALOG.recipes.length === 0 ? (
            <EmptyState icon={<BookOpen className="size-7" />} title="Aucune recette disponible">
              Les recettes n’ont pas pu être chargées.
            </EmptyState>
          ) : (
            RECIPE_CATALOG.recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)
          )}
        </div>
      )}

      {tab === 'saved' && (
        <div className="mt-4 space-y-2">
          {saved.length === 0 ? (
            <EmptyState icon={<Heart className="size-7" />} title="Aucune recette enregistrée">
              Touchez « Enregistrer » sur une recette pour la retrouver ici.
            </EmptyState>
          ) : (
            saved.map((r) => <RecipeCard key={r.id} recipe={r} />)
          )}
        </div>
      )}
    </>
  )
}
