import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Camera, ChefHat, ChevronRight, Plus, Refrigerator, ShieldAlert, Sparkles } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Card, SectionTitle } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PriorityBadge } from '../../components/Badge'
import { useToast } from '../../components/Toast'
import { useFavorites, useInventory, useStaples } from '../../hooks/useData'
import { needsAttention, prioritize } from '../../domain/priority'
import { suggestRecipes } from '../../domain/matching'
import { CATALOG_BY_ID } from '../../data/catalog'
import { RECIPE_CATALOG, findRecipe } from '../../services/recipes'
import { loadDemoInventory } from '../../services/inventory'
import { RecipeCard } from '../recipes/RecipeCard'
import { UnreadableNotice } from '../../components/UnreadableNotice'

function greeting(now = new Date()) {
  const h = now.getHours()
  return h >= 5 && h < 18 ? 'Bonjour' : 'Bonsoir'
}

export function HomePage() {
  const inventory = useInventory()
  const staples = useStaples()
  const favorites = useFavorites()
  const toast = useToast()
  const navigate = useNavigate()

  const priorities = useMemo(() => (inventory ? prioritize(inventory) : []), [inventory])
  const attention = useMemo(() => (inventory ? needsAttention(inventory) : []), [inventory])
  const suggestions = useMemo(
    () => (inventory && staples ? suggestRecipes(RECIPE_CATALOG.recipes, inventory, CATALOG_BY_ID, { staples }).slice(0, 3) : []),
    [inventory, staples],
  )
  const saved = (favorites ?? []).map(findRecipe).filter((r) => r !== undefined).slice(0, 3)

  if (inventory === undefined) return <div aria-busy="true" />

  const header = (
    <header className="mb-6">
      <p className="font-display text-[32px] font-semibold leading-tight">{greeting()}</p>
      <p className="mt-1 text-lg text-muted">Cuisinez quelque chose de bon avec ce que vous avez déjà.</p>
      <div className="mt-4">
        <UnreadableNotice />
      </div>
    </header>
  )

  if (inventory.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          icon={<Refrigerator className="size-7" />}
          title="Votre inventaire est vide"
          actions={
            <>
              <ButtonLink to="/inventaire/nouveau" icon={<Plus className="size-4" aria-hidden="true" />}>
                Ajouter un ingrédient
              </ButtonLink>
              <Button
                variant="secondary"
                icon={<Sparkles className="size-4" aria-hidden="true" />}
                onClick={() =>
                  void toast.run(async () => {
                    const n = await loadDemoInventory()
                    toast.success(`${n} ingrédients fictifs ajoutés pour essayer l’application.`)
                  })
                }
              >
                Essayer avec la démo
              </Button>
            </>
          }
        >
          Notez ce que vous avez dans le frigo et les placards : Mijoté vous dira quoi utiliser en premier et quoi
          cuisiner avec.
        </EmptyState>
        <div className="mt-4">
          <ButtonLink to="/scanner" variant="ghost" className="w-full" icon={<Camera className="size-4" aria-hidden="true" />}>
            Scanner mon frigo
          </ButtonLink>
        </div>
      </>
    )
  }

  return (
    <>
      {header}

      <Card className="border-0 bg-hero text-on-hero">
        <p className="text-sm font-semibold opacity-80">Dans votre cuisine</p>
        <p className="mt-1 font-display text-3xl font-semibold">
          {inventory.length} ingrédient{inventory.length > 1 ? 's' : ''}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {priorities.length > 0
            ? `${priorities.length} à utiliser en priorité`
            : 'Aucun signalé comme prioritaire pour l’instant'}
          {attention.length > 0 && ` · ${attention.length} à vérifier`}
        </p>
        <div className="mt-4 grid gap-2">
          <Button variant="accent" size="lg" icon={<ChefHat className="size-5" aria-hidden="true" />} onClick={() => navigate('/recettes')}>
            Trouver une recette
          </Button>
          <Button
            size="lg"
            className="border border-white/30 bg-white/10 !text-on-hero hover:bg-white/20"
            icon={<Camera className="size-5" aria-hidden="true" />}
            onClick={() => navigate('/scanner')}
          >
            Scanner mon frigo
          </Button>
        </div>
      </Card>

      {attention.length > 0 && (
        <>
          <SectionTitle>À vérifier</SectionTitle>
          <ul className="space-y-2">
            {attention.map(({ item, priority }) => (
              <li key={item.id}>
                <Link to={`/inventaire/${item.id}`} className="flex items-start gap-3 rounded-3xl border border-danger/30 bg-danger-soft p-4">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-sm">{priority.reasons[0]}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle
        action={
          <Link to="/inventaire" className="text-sm font-semibold text-primary">
            Tout voir
          </Link>
        }
      >
        À utiliser en priorité
      </SectionTitle>
      {priorities.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Rien n’est signalé comme prioritaire. Pour affiner, ajoutez les dates de vos produits (DLC ou DDM), indiquez
            ce qui est entamé, ou marquez un ingrédient « à utiliser vite ».
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {priorities.slice(0, 4).map(({ item, priority }) => (
            <li key={item.id}>
              <Link to={`/inventaire/${item.id}`} className="block rounded-3xl border border-line bg-card p-4 hover:border-primary/40">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.name}</span>
                  <PriorityBadge priority={priority} />
                </span>
                <span className="mt-1 block text-sm text-muted">{priority.reasons[0]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle
        action={
          <Link to="/recettes" className="text-sm font-semibold text-primary">
            Toutes les recettes
          </Link>
        }
      >
        {saved.length > 0 ? 'Mes recettes enregistrées' : 'Idées pour vous'}
      </SectionTitle>
      <div className="space-y-2">
        {saved.length > 0 ? (
          saved.map((r) => <RecipeCard key={r.id} recipe={r} />)
        ) : suggestions.length > 0 ? (
          suggestions.map((m) => <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />)
        ) : (
          <Card>
            <p className="text-sm text-muted">
              Aucune recette de démonstration n’utilise encore vos ingrédients. Parcourez toutes les recettes ou ajoutez
              d’autres ingrédients.
            </p>
          </Card>
        )}
      </div>
    </>
  )
}
