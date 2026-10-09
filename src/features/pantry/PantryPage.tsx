import { useState } from 'react'
import { addPantryItem, deletePantryItem, updatePantryItem } from '../../data/db'
import { expiryStatus } from '../../domain/dates'
import { LOCATIONS, type Location, type PantryItem } from '../../domain/types'
import { ExpiryBadge } from '../../ui/ExpiryBadge'
import { formatQuantity } from '../../domain/format'
import { PageHeader } from '../../ui/PageHeader'
import { PantryForm } from './PantryForm'
import { usePantry } from './usePantry'

type Editing = { mode: 'add' } | { mode: 'edit'; item: PantryItem } | null

export function PantryPage() {
  const pantry = usePantry()
  const [editing, setEditing] = useState<Editing>(null)
  const [filter, setFilter] = useState<Location | 'tout'>('tout')

  const urgentCount = pantry?.filter((i) => ['expired', 'today', 'soon'].includes(expiryStatus(i.expiresOn))).length ?? 0
  const visible = pantry?.filter((i) => filter === 'tout' || i.location === filter)

  return (
    <>
      <PageHeader
        title="Garde-manger"
        subtitle={
          pantry === undefined
            ? undefined
            : urgentCount > 0
              ? `${urgentCount} produit${urgentCount > 1 ? 's' : ''} à consommer rapidement`
              : `${pantry.length} produit${pantry.length > 1 ? 's' : ''}`
        }
        action={
          !editing && (
            <button className="btn" onClick={() => setEditing({ mode: 'add' })}>
              + Ajouter
            </button>
          )
        }
      />

      {editing?.mode === 'add' && (
        <PantryForm
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            await addPantryItem(input)
            setEditing(null)
          }}
        />
      )}
      {editing?.mode === 'edit' && (
        <PantryForm
          key={editing.item.id}
          initial={editing.item}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            await updatePantryItem(editing.item.id, input)
            setEditing(null)
          }}
          onDelete={async () => {
            await deletePantryItem(editing.item.id)
            setEditing(null)
          }}
        />
      )}

      {pantry && pantry.length > 0 && (
        <div className="chips filter">
          {(['tout', ...LOCATIONS] as const).map((l) => (
            <button
              key={l}
              className={`chip chip-cap ${filter === l ? 'chip-active' : ''}`}
              aria-pressed={filter === l}
              onClick={() => setFilter(l)}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {pantry?.length === 0 && !editing && (
        <div className="empty">
          <p className="empty-icon" aria-hidden="true">
            🧺
          </p>
          <p>Votre garde-manger est vide.</p>
          <p className="muted">Ajoutez ce que vous avez au frigo : Mijoté vous dira quoi cuisiner en priorité.</p>
        </div>
      )}

      <ul className="list">
        {visible?.map((item) => (
          <li key={item.id}>
            <button className="list-item" onClick={() => setEditing({ mode: 'edit', item })}>
              <span className="list-item-main">
                <strong>{item.name}</strong>
                <small className="muted">
                  {item.quantity !== null && `${formatQuantity(item.quantity, item.unit)} · `}
                  {item.location}
                </small>
              </span>
              <ExpiryBadge date={item.expiresOn} />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
