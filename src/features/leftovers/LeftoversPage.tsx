import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ChefHat, CookingPot, History, Pencil, Plus, RotateCcw, ShieldAlert, Trash2, Utensils } from 'lucide-react'
import { Badge, PriorityBadge } from '../../components/Badge'
import { Button, ButtonLink, buttonClasses } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { QuantityStepper } from '../../components/QuantityStepper'
import { UnreadableNotice } from '../../components/UnreadableNotice'
import { useToast } from '../../components/Toast'
import { useStoredLeftovers } from '../../hooks/useData'
import { sortLeftovers } from '../../domain/leftovers'
import { formatDate } from '../../domain/dates'
import { formatQuantity } from '../../domain/quantity'
import type { Leftover } from '../../domain/types'
import type { Priority } from '../../domain/priority'
import { CATALOG_BY_ID } from '../../data/catalog'
import { fr } from '../../i18n/fr'
import { closeLeftover, deleteLeftover, reopenLeftover, stepLeftover } from '../../services/leftovers'
import { findRecipe } from '../../services/recipes'
import { InventoryTabs } from '../inventory/InventoryTabs'

export function LeftoversPage() {
  const stored = useStoredLeftovers()
  const sorted = useMemo(() => (stored ? sortLeftovers(stored.leftovers.filter((l) => l.status === 'available')) : undefined), [stored])
  const history = useMemo(
    () =>
      (stored?.leftovers ?? [])
        .filter((l) => l.status !== 'available')
        .sort((a, b) => (b.closedAt ?? b.updatedAt).localeCompare(a.closedAt ?? a.updatedAt)),
    [stored],
  )

  if (!sorted) return <div aria-busy="true" />
  const consumed = history.filter((l) => l.status === 'consumed').length
  const discarded = history.length - consumed

  return (
    <>
      <PageHeader
        title="Mon inventaire"
        subtitle={sorted.length === 0 ? 'Les plats et aliments déjà cuisinés' : `${sorted.length} reste${sorted.length > 1 ? 's' : ''} à manger`}
      />
      <InventoryTabs />
      <UnreadableNotice source="leftovers" />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CookingPot className="size-7" />}
          title="Aucun reste pour l’instant"
          actions={
            <>
              <ButtonLink to="/inventaire/restes/nouveau" icon={<Plus className="size-4" aria-hidden="true" />}>
                Ajouter un reste
              </ButtonLink>
              <ButtonLink to="/recettes" variant="secondary" icon={<ChefHat className="size-4" aria-hidden="true" />}>
                Cuisiner une recette
              </ButtonLink>
            </>
          }
        >
          Après avoir cuisiné une recette dans Mijoté, les portions que vous gardez apparaissent ici. Vous pouvez aussi
          ajouter un reste à la main.
        </EmptyState>
      ) : (
        <ul className="space-y-2" aria-label="Restes disponibles">
          {sorted.map(({ leftover, priority }) => (
            <LeftoverCard key={leftover.id} leftover={leftover} priority={priority} />
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <Card className="mt-6">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <History className="size-4 text-muted" aria-hidden="true" />
              Historique : {consumed} consommé{consumed > 1 ? 's' : ''}, {discarded} jeté{discarded > 1 ? 's' : ''}
            </summary>
            <ul className="mt-3 divide-y divide-line" aria-label="Historique des restes">
              {history.map((l) => (
                <HistoryRow key={l.id} leftover={l} />
              ))}
            </ul>
          </details>
        </Card>
      )}

      <div className="h-16" aria-hidden="true" />
      <Link
        to="/inventaire/restes/nouveau"
        className={buttonClasses('primary', 'lg', 'fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-10 shadow-lg shadow-primary/25')}
      >
        <Plus className="size-5" aria-hidden="true" />
        Ajouter un reste
      </Link>
    </>
  )
}

function LeftoverCard({ leftover: l, priority }: { leftover: Leftover; priority: Priority }) {
  const toast = useToast()
  const recipe = l.recipeId ? findRecipe(l.recipeId) : undefined
  const linked = l.ingredientId ? CATALOG_BY_ID.get(l.ingredientId)?.name : undefined
  const alert = priority.safety !== 'ok'
  return (
    <li className={`rounded-3xl border bg-card p-4 ${alert ? 'border-danger/40' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{l.name}</p>
          <p className="mt-0.5 text-sm text-muted">
            {linked ? `Réutilisable comme : ${linked.toLocaleLowerCase('fr-FR')}` : 'Plat préparé'}
            {l.note && ` · ${l.note}`}
          </p>
        </div>
        <span className="flex flex-col items-end gap-1">
          <PriorityBadge priority={priority} />
          {l.source === 'demo' && <Badge>Démo</Badge>}
        </span>
      </div>

      {alert ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {priority.reasons[0]}
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5 text-sm text-muted">
          {priority.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {recipe && (
        <p className="mt-2 text-sm">
          Recette d’origine :{' '}
          <Link to={`/recettes/${recipe.id}`} className="font-semibold text-primary underline">
            {recipe.title}
          </Link>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <QuantityStepper name={l.name} quantity={l.quantity} unit={l.unit} onStep={(d) => void toast.run(() => stepLeftover(l.id, d))} />
        <Link to={`/inventaire/restes/${l.id}`} className={buttonClasses('ghost', 'sm')} aria-label={`Modifier ${l.name}`}>
          <Pencil className="size-4" aria-hidden="true" />
          Modifier
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Utensils className="size-4" aria-hidden="true" />}
          onClick={() => void toast.run(() => closeLeftover(l.id, 'consumed'), `« ${l.name} » marqué comme mangé.`)}
        >
          Mangé
        </Button>
        <Button
          size="sm"
          variant="danger"
          icon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => void toast.run(() => closeLeftover(l.id, 'discarded'), `« ${l.name} » marqué comme jeté.`)}
        >
          Jeté
        </Button>
      </div>
    </li>
  )
}

function HistoryRow({ leftover: l }: { leftover: Leftover }) {
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{l.name}</p>
          <p className="text-sm text-muted">
            {fr.leftoverStatus[l.status]}
            {l.closedAt && ` le ${formatDate(l.closedAt.slice(0, 10))}`}
            {l.quantity !== null && l.quantity > 0 && ` · ${formatQuantity(l.quantity, l.unit)}`}
          </p>
        </div>
        <Badge tone={l.status === 'consumed' ? 'ok' : 'neutral'}>{fr.leftoverStatus[l.status]}</Badge>
      </div>
      {confirm ? (
        <div className="mt-2 rounded-2xl bg-danger-soft p-3">
          <p className="text-sm font-semibold">Supprimer définitivement « {l.name} » de l’historique ?</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button size="sm" variant="danger" className="flex-1 !bg-danger !text-white" onClick={() => void toast.run(() => deleteLeftover(l.id), 'Reste supprimé.')}>
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
            onClick={() => void toast.run(() => reopenLeftover(l.id), `« ${l.name} » remis dans les restes.`)}
          >
            Remettre dans les restes
          </Button>
          <Button size="sm" variant="ghost" className="!text-danger" onClick={() => setConfirm(true)}>
            Supprimer
          </Button>
        </div>
      )}
    </li>
  )
}
