import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Check, Pencil, Plus, Refrigerator, Search, Sparkles, X } from 'lucide-react'
import { Button, ButtonLink, buttonClasses } from '../../components/Button'
import { Badge, PriorityBadge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { QuantityStepper } from '../../components/QuantityStepper'
import { Segmented } from '../../components/Segmented'
import { inputClasses } from '../../components/Field'
import { UnreadableNotice } from '../../components/UnreadableNotice'
import { InventoryTabs } from './InventoryTabs'
import { useToast } from '../../components/Toast'
import { useInventory, useStaples } from '../../hooks/useData'
import { computePriority, type Priority } from '../../domain/priority'
import { normalize } from '../../domain/text'
import { CATEGORIES, type InventoryItem } from '../../domain/types'
import { CATALOG } from '../../data/catalog'
import { fr } from '../../i18n/fr'
import { loadDemoInventory, stepQuantity } from '../../services/inventory'
import { toggleStaple } from '../../services/preferences'

type View = 'category' | 'priority'
type Row = { item: InventoryItem; priority: Priority }

const STAPLES = CATALOG.filter((i) => i.category === 'staple')

export function InventoryPage() {
  const inventory = useInventory()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('category')

  const rows = useMemo<Row[]>(() => {
    const q = normalize(query)
    return (inventory ?? [])
      .filter((item) => !q || normalize(item.name).includes(q))
      .map((item) => ({ item, priority: computePriority(item) }))
  }, [inventory, query])

  if (inventory === undefined) return <div aria-busy="true" />

  const groups: { title: string; rows: Row[] }[] =
    view === 'category'
      ? CATEGORIES.map((c) => ({
          title: fr.category[c],
          rows: rows.filter((r) => r.item.category === c).sort((a, b) => a.item.name.localeCompare(b.item.name, 'fr')),
        })).filter((g) => g.rows.length > 0)
      : [{ title: '', rows: [...rows].sort((a, b) => b.priority.score - a.priority.score) }]

  return (
    <>
      <PageHeader
        title="Mon inventaire"
        subtitle={inventory.length === 0 ? 'Ce que vous avez à la maison' : `${inventory.length} ingrédient${inventory.length > 1 ? 's' : ''} suivi${inventory.length > 1 ? 's' : ''}`}
      />

      <InventoryTabs />
      <UnreadableNotice />
      <StaplesCard />

      {inventory.length === 0 ? (
        <EmptyState
          icon={<Refrigerator className="size-7" />}
          title="Aucun ingrédient pour l’instant"
          actions={
            <>
              <ButtonLink to="/inventaire/nouveau" icon={<Plus className="size-4" aria-hidden="true" />}>
                Ajouter un ingrédient
              </ButtonLink>
              <Button
                variant="secondary"
                icon={<Sparkles className="size-4" aria-hidden="true" />}
                onClick={() => void toast.run(loadDemoInventory, 'Ingrédients fictifs ajoutés.')}
              >
                Essayer avec la démo
              </Button>
            </>
          }
        >
          Ajoutez ce qu’il y a dans votre frigo, vos placards et votre congélateur.
        </EmptyState>
      ) : (
        <>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un ingrédient"
              aria-label="Rechercher dans l’inventaire"
              className={`${inputClasses} pl-11`}
            />
          </div>
          <div className="mt-3">
            <Segmented
              label="Trier l’inventaire"
              value={view}
              onChange={setView}
              options={[
                { value: 'category', label: 'Par catégorie' },
                { value: 'priority', label: 'Par priorité' },
              ]}
            />
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 text-center text-muted">
              <p>Aucun ingrédient ne correspond à « {query} ».</p>
              <Button variant="ghost" className="mt-2" icon={<X className="size-4" aria-hidden="true" />} onClick={() => setQuery('')}>
                Effacer la recherche
              </Button>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.title || 'all'} aria-label={g.title || 'Ingrédients par priorité'}>
                {g.title && (
                  <h2 className="mb-2 mt-6 flex items-baseline gap-2 text-lg font-semibold">
                    {g.title} <span className="font-sans text-sm font-normal text-muted">{g.rows.length}</span>
                  </h2>
                )}
                <ul className={`space-y-2 ${g.title ? '' : 'mt-4'}`}>
                  {g.rows.map((r) => (
                    <ItemCard key={r.item.id} row={r} onStep={(d) => void toast.run(() => stepQuantity(r.item.id, d))} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}

      {/* Espace pour que le bouton flottant ne masque pas le dernier ingrédient. */}
      <div className="h-16" aria-hidden="true" />
      <Link
        to="/inventaire/nouveau"
        className={buttonClasses('primary', 'lg', 'fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-10 shadow-lg shadow-primary/25')}
      >
        <Plus className="size-5" aria-hidden="true" />
        Ajouter
      </Link>
    </>
  )
}

function ItemCard({ row: { item, priority }, onStep }: { row: Row; onStep: (d: 1 | -1) => void }) {
  return (
    <li className="rounded-3xl border border-line bg-card p-4">
      <Link to={`/inventaire/${item.id}`} className="block" aria-label={`Modifier ${item.name}`}>
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">{item.name}</span>
            <span className="mt-0.5 block text-sm text-muted">
              {fr.status[item.status]}
              {item.location && ` · ${fr.location[item.location]}`}
            </span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <PriorityBadge priority={priority} />
            {item.source === 'demo' && <Badge>Démo</Badge>}
          </span>
        </span>
        <span className="mt-2 block text-sm text-muted">{priority.reasons[0]}</span>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <QuantityStepper name={item.name} quantity={item.quantity} unit={item.unit} onStep={onStep} />
        <Link to={`/inventaire/${item.id}`} className={buttonClasses('ghost', 'sm')}>
          <Pencil className="size-4" aria-hidden="true" />
          Modifier
        </Link>
      </div>
    </li>
  )
}

/** Basiques (sel, huile…) : jamais supposés présents, l'utilisateur les confirme ici. */
function StaplesCard() {
  const staples = useStaples()
  const toast = useToast()
  return (
    <Card>
      <h2 className="text-lg font-semibold">Mes basiques</h2>
      <p className="mt-0.5 text-sm text-muted">Cochez ce que vous avez : ils seront comptés comme disponibles dans les recettes.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STAPLES.map((s) => {
          const on = staples?.has(s.id) ?? false
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => void toast.run(() => toggleStaple(s.id))}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-ink hover:bg-primary-soft'
              }`}
            >
              {on && <Check className="size-4" aria-hidden="true" />}
              {s.name}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
