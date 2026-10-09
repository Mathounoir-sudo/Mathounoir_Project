import { useMemo, useState, type FormEvent } from 'react'
import { INGREDIENTS, INGREDIENTS_BY_ID } from '../../data/ingredients'
import type { PantryInput } from '../../data/db'
import { buildMatchers, matchIngredient } from '../../domain/ingredients'
import { todayISO } from '../../domain/dates'
import { LOCATIONS, UNITS, type PantryItem } from '../../domain/types'

const matchers = buildMatchers(INGREDIENTS)

const QUICK_DAYS = [
  { label: "Aujourd'hui", days: 0 },
  { label: '+3 j', days: 3 },
  { label: '+1 sem.', days: 7 },
  { label: '+1 mois', days: 30 },
]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

interface Props {
  initial?: PantryItem
  onSubmit: (input: PantryInput) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function PantryForm({ initial, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [unit, setUnit] = useState(initial?.unit ?? 'pièce')
  const [location, setLocation] = useState(initial?.location ?? 'frigo')
  const [expiresOn, setExpiresOn] = useState(initial?.expiresOn ?? '')
  const [saving, setSaving] = useState(false)

  const recognized = useMemo(() => {
    const id = matchIngredient(name, matchers)
    return id ? INGREDIENTS_BY_ID.get(id)?.name : null
  }, [name])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const parsed = Number.parseFloat(quantity.replace(',', '.'))
    try {
      await onSubmit({
        name,
        quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
        unit,
        location,
        expiresOn: expiresOn || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{initial ? 'Modifier le produit' : 'Ajouter un produit'}</h2>

      <label className="field">
        <span>Produit</span>
        <input
          autoFocus
          required
          list="ingredient-suggestions"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex. Tomates cerises"
          autoComplete="off"
        />
        <datalist id="ingredient-suggestions">
          {INGREDIENTS.filter((i) => i.category !== 'base').map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        <small className="muted">
          {name.trim() === ''
            ? ' '
            : recognized
              ? `Reconnu : ${recognized} — utilisé pour les suggestions de recettes`
              : 'Produit non reconnu : il ne sera pas utilisé pour les suggestions'}
        </small>
      </label>

      <div className="row">
        <label className="field">
          <span>Quantité</span>
          <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="facultatif" />
        </label>
        <label className="field">
          <span>Unité</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="field">
        <legend>Rangé dans</legend>
        <div className="chips">
          {LOCATIONS.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip chip-cap ${location === l ? 'chip-active' : ''}`}
              aria-pressed={location === l}
              onClick={() => setLocation(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>À consommer avant le</span>
        <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
      </label>
      <div className="chips">
        {QUICK_DAYS.map((q) => (
          <button key={q.label} type="button" className="chip" onClick={() => setExpiresOn(addDays(q.days))}>
            {q.label}
          </button>
        ))}
        {expiresOn && (
          <button type="button" className="chip" onClick={() => setExpiresOn('')}>
            Sans date
          </button>
        )}
      </div>

      <div className="form-actions">
        {onDelete && (
          <button type="button" className="btn btn-danger" onClick={() => void onDelete()}>
            Supprimer
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn" disabled={saving || !name.trim()}>
          Enregistrer
        </button>
      </div>
    </form>
  )
}
