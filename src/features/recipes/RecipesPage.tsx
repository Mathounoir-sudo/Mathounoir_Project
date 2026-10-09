import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, ChefHat, Heart, Info, Plus } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { Segmented } from '../../components/Segmented'
import { ServingsSelector } from '../../components/ServingsSelector'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import { useFavorites } from '../../hooks/useData'
import { useRecommendations } from '../../hooks/useRecipeEngine'
import { setServings } from '../../services/preferences'
import { RecipeCard } from './RecipeCard'

type Tab = 'suggestions' | 'all' | 'saved'

export function RecipesPage() {
  const [tab, setTab] = useState<Tab>('suggestions')
  const [strict, setStrict] = useState(false)
  const result = useRecommendations(strict)
  const favorites = useFavorites()
  const toast = useToast()

  if (!result) return <div aria-busy="true" />
  const { recommendations, ranked, excluded, all, inventory, staples, servings } = result
  const byId = new Map(all.map((e) => [e.recipe.id, e]))
  const saved = (favorites ?? []).map((id) => byId.get(id)).filter((e) => e !== undefined)
  const othersCount = ranked.length - recommendations.length

  return (
    <>
      <PageHeader title="Mes recettes" subtitle="Que cuisiner maintenant avec ce que j’ai ?" />

      <div className="space-y-3">
        <ServingsSelector value={servings} onChange={(n) => void toast.run(() => setServings(n))} />
        <Segmented
          label="Afficher"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'suggestions', label: 'Pour moi' },
            { value: 'all', label: `Toutes (${all.length})` },
            { value: 'saved', label: 'Enregistrées' },
          ]}
        />
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Recettes de démonstration, choisies par des règles transparentes à partir de votre inventaire. Aucune IA
          n’est utilisée.
        </p>
      </div>

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
          {staples.size === 0 && inventory.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Astuce : confirmez vos basiques (sel, huile…) dans{' '}
              <Link to="/inventaire" className="font-semibold text-primary underline">
                l’inventaire
              </Link>{' '}
              : ils ne sont jamais supposés présents.
            </p>
          )}

          <div className="mt-4 space-y-3">
            {inventory.length === 0 ? (
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
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={<ChefHat className="size-7" />}
                title={strict ? 'Aucune recette sans courses' : 'Aucune recette n’utilise vos ingrédients'}
                actions={
                  <>
                    {strict && <Button onClick={() => setStrict(false)}>Voir les recettes avec courses</Button>}
                    <ButtonLink to="/inventaire" variant="secondary">
                      Compléter mon inventaire
                    </ButtonLink>
                    {!strict && (
                      <Button variant="secondary" onClick={() => setTab('all')}>
                        Parcourir toutes les recettes
                      </Button>
                    )}
                  </>
                }
              >
                {strict
                  ? 'Avec votre inventaire actuel, chaque recette demande au moins un achat. Vous pouvez afficher les recettes avec courses, ajouter des ingrédients oubliés ou confirmer vos basiques.'
                  : 'Aucune recette de démonstration n’utilise les ingrédients enregistrés. Vérifiez l’ingrédient correspondant de vos produits dans l’inventaire.'}
              </EmptyState>
            ) : (
              <>
                <h2 className="sr-only">Recommandations</h2>
                {recommendations.map((r) => (
                  <RecipeCard key={r.evaluation.recipe.id} evaluation={r.evaluation} reasons={r.reasons} />
                ))}
                {othersCount > 0 && (
                  <Button variant="ghost" className="w-full" onClick={() => setTab('all')}>
                    Voir les {othersCount} autre{othersCount > 1 ? 's' : ''} recette{othersCount > 1 ? 's' : ''} compatible
                    {othersCount > 1 ? 's' : ''}
                  </Button>
                )}
              </>
            )}

            {strict && excluded.length > 0 && (
              <Card>
                <details>
                  <summary className="cursor-pointer font-semibold">
                    {excluded.length} recette{excluded.length > 1 ? 's' : ''} écartée{excluded.length > 1 ? 's' : ''} car il
                    faudrait faire des courses
                  </summary>
                  <ul className="mt-2 space-y-2 text-sm">
                    {excluded.map((r) => (
                      <li key={r.evaluation.recipe.id}>
                        <Link to={`/recettes/${r.evaluation.recipe.id}`} className="font-semibold text-primary underline">
                          {r.evaluation.recipe.title}
                        </Link>{' '}
                        — {r.reasons[0]}
                      </li>
                    ))}
                  </ul>
                </details>
              </Card>
            )}
          </div>
        </>
      )}

      {tab === 'all' && (
        <div className="mt-4 space-y-2">
          {all.length === 0 ? (
            <EmptyState icon={<BookOpen className="size-7" />} title="Aucune recette disponible">
              Les recettes n’ont pas pu être chargées.
            </EmptyState>
          ) : (
            all.map((e) => <RecipeCard key={e.recipe.id} evaluation={e} compact />)
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
            saved.map((e) => <RecipeCard key={e.recipe.id} evaluation={e} compact />)
          )}
        </div>
      )}
    </>
  )
}
