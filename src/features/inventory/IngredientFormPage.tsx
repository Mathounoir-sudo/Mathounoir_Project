import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SearchX, Trash2 } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Field, describedBy, inputClasses } from '../../components/Field'
import { PageHeader } from '../../components/PageHeader'
import { Toggle } from '../../components/Toggle'
import { useToast } from '../../components/Toast'
import { db, categoryOf } from '../../lib/db'
import { readStoredItems } from '../../domain/stored'
import { CATALOG, CATALOG_BY_ID } from '../../data/catalog'
import { buildMatchers, linkIngredient, resolveLink, searchCatalog } from '../../domain/ingredients'
import { fieldErrors, inventoryFormSchema, type InventoryFormValues } from '../../domain/schemas'
import { CATEGORIES, DATE_KINDS, LOCATIONS, STATUSES, UNITS, type Category, type InventoryItem } from '../../domain/types'
import { fr } from '../../i18n/fr'
import { addItem, deleteItem, updateItem } from '../../services/inventory'

/**
 * L'inventaire contient des produits BRUTS : les ingrédients « cuisinés » (riz cuit, soupe…) en sont exclus,
 * ils se gèrent dans « Mes restes ». Les deux index servent à proposer un lien, et à repérer un nom de reste.
 */
const RAW_CATALOG = CATALOG.filter((i) => i.category !== 'prepared')
const matchers = buildMatchers(RAW_CATALOG)
const allMatchers = buildMatchers(CATALOG)

const DATE_HELP: Record<(typeof DATE_KINDS)[number], string> = {
  'use-by': 'Après cette date, le produit ne doit plus être consommé.',
  'best-before': 'Après cette date, le produit peut perdre en qualité, mais ce n’est pas une date limite de sécurité.',
  unspecified: 'Mijoté restera prudent tant que le type de date n’est pas précisé.',
}

function toValues(item?: InventoryItem): InventoryFormValues {
  return {
    ingredientId: item ? (resolveLink(item, matchers)?.ingredientId ?? '') : '',
    // (un ancien lien vers un ingrédient cuisiné n'est pas proposé : resolveLink utilise l'index des produits bruts)
    name: item?.name ?? '',
    category: item?.category ?? 'other',
    quantity: item?.quantity?.toString().replace('.', ',') ?? '',
    unit: item?.unit ?? 'unité',
    location: item?.location ?? 'fridge',
    status: item?.status ?? 'unopened',
    purchasedOn: item?.purchasedOn ?? '',
    openedOn: item?.openedOn ?? '',
    dateKind: item?.dateLabel?.kind ?? '',
    date: item?.dateLabel?.date ?? '',
    urgent: item?.urgent ?? false,
  }
}

export function IngredientFormPage() {
  const { id } = useParams()
  // [item] : distingue « chargement » (undefined) de « introuvable » ([undefined]).
  const loaded = useLiveQuery(async () => {
    if (!id) return { item: undefined, problem: null }
    const raw = await db.pantry.get(id)
    if (raw === undefined) return { item: undefined, problem: null }
    const { items, unreadable } = readStoredItems([raw], categoryOf)
    return { item: items[0], problem: unreadable[0]?.problem ?? null }
  }, [id])

  if (loaded === undefined) return <div aria-busy="true" />
  const { item, problem } = loaded
  if (problem) {
    return (
      <>
        <PageHeader title="Ingrédient illisible" back={{ to: '/inventaire', label: 'Inventaire' }} />
        <EmptyState
          icon={<SearchX className="size-7" />}
          title="Cet ingrédient ne peut pas être ouvert"
          actions={<ButtonLink to="/inventaire">Retour à l’inventaire</ButtonLink>}
        >
          Son enregistrement n’a pas le format attendu ({problem}). Il reste stocké sur cet appareil, rien n’a été modifié.
        </EmptyState>
      </>
    )
  }
  if (id && !item) {
    return (
      <>
        <PageHeader title="Ingrédient introuvable" back={{ to: '/inventaire', label: 'Inventaire' }} />
        <EmptyState
          icon={<SearchX className="size-7" />}
          title="Cet ingrédient n’existe plus"
          actions={<ButtonLink to="/inventaire">Retour à l’inventaire</ButtonLink>}
        >
          Il a peut-être été supprimé.
        </EmptyState>
      </>
    )
  }
  return <IngredientForm key={id ?? 'new'} item={item} />
}

function IngredientForm({ item }: { item?: InventoryItem }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState<InventoryFormValues>(() => toValues(item))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const categoryTouched = useRef(Boolean(item))
  // L'ingrédient correspondant est-il choisi par l'utilisateur (sinon il suit le nom) ?
  const [linkManual, setLinkManual] = useState(Boolean(item?.linkConfirmed))
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof InventoryFormValues>(key: K, value: InventoryFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key])
      setErrors((e) => {
        const next = { ...e }
        delete next[key]
        return next
      })
  }

  const autoLink = useMemo(() => linkIngredient(values.name, matchers), [values.name])
  const suggestions = useMemo(
    () => (showSuggestions ? searchCatalog(values.name, RAW_CATALOG).filter((s) => s.name !== values.name) : []),
    [values.name, showSuggestions],
  )

  function setName(name: string) {
    set('name', name)
    // Ingrédient correspondant et catégorie proposés d'après le nom, tant que l'utilisateur ne les a pas choisis.
    const link = linkIngredient(name, matchers)
    if (!linkManual) set('ingredientId', link?.ingredientId ?? '')
    if (!categoryTouched.current) set('category', (link && CATALOG_BY_ID.get(link.ingredientId)?.category) || 'other')
  }

  function setLink(id: string) {
    setLinkManual(true)
    set('ingredientId', id)
    const ing = CATALOG_BY_ID.get(id)
    if (ing && !categoryTouched.current) set('category', ing.category)
  }

  function pickSuggestion(id: string) {
    const ing = CATALOG_BY_ID.get(id)
    if (!ing) return
    setName(ing.name)
    setLink(id)
    setShowSuggestions(false)
  }

  const looksCooked = useMemo(
    () => CATALOG_BY_ID.get(linkIngredient(values.name, allMatchers)?.ingredientId ?? '')?.category === 'prepared',
    [values.name],
  )

  const linkHint = !values.ingredientId
    ? 'Aucun : ce produit sera enregistré, mais pas utilisé dans les suggestions de recettes.'
    : !linkManual && autoLink?.certainty === 'probable' && autoLink.ingredientId === values.ingredientId
      ? 'Proposé d’après le nom : vérifiez qu’il s’agit bien du même ingrédient avant d’enregistrer.'
      : 'Utilisé pour les suggestions de recettes.'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = inventoryFormSchema.safeParse(values)
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error)
      setErrors(errs)
      // Place le curseur sur le premier champ en erreur.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    const ok = await toast.run(async () => {
      if (item) await updateItem(item.id, parsed.data)
      else await addItem(parsed.data)
      return true
    }, item ? 'Modifications enregistrées.' : `« ${parsed.data.name} » ajouté à l’inventaire.`)
    setSaving(false)
    if (ok) navigate('/inventaire')
  }

  async function onDelete() {
    if (!item) return
    const ok = await toast.run(async () => {
      await deleteItem(item.id)
      return true
    }, `« ${item.name} » supprimé.`)
    if (ok) navigate('/inventaire')
  }

  const chip = (active: boolean) =>
    `min-h-10 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
      active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-ink hover:bg-primary-soft'
    }`

  return (
    <>
      <PageHeader title={item ? 'Modifier l’ingrédient' : 'Ajouter un ingrédient'} back={{ to: '/inventaire', label: 'Inventaire' }} />

      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <Card className="space-y-4">
          <Field
            id="name"
            label="Nom"
            error={errors.name}
          >
            <div className="relative">
              <input
                {...describedBy('name', errors.name)}
                className={inputClasses}
                value={values.name}
                onChange={(e) => {
                  setName(e.target.value)
                  setShowSuggestions(true)
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="ex. Tomates, lait, reste de riz…"
                autoComplete="off"
                autoFocus={!item}
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-controls="name-suggestions"
                aria-autocomplete="list"
              />
              {suggestions.length > 0 && (
                <ul id="name-suggestions" role="listbox" aria-label="Ingrédients courants" className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
                  {suggestions.map((s) => (
                    <li key={s.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between px-4 text-left hover:bg-primary-soft"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickSuggestion(s.id)}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted">{fr.category[s.category]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          {looksCooked && !item && (
            <p role="status" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm">
              Cela ressemble à un plat ou un aliment déjà cuisiné. Pour ne pas le confondre avec un produit cru,{' '}
              <Link to="/inventaire/restes/nouveau" className="font-semibold text-primary underline">
                ajoutez-le plutôt dans « Mes restes »
              </Link>
              .
            </p>
          )}
          <Field id="ingredientId" label="Ingrédient correspondant (pour les recettes)" error={errors.ingredientId} hint={linkHint}>
            <select
              {...describedBy('ingredientId', errors.ingredientId, true)}
              className={inputClasses}
              value={values.ingredientId}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">Aucun</option>
              {CATEGORIES.filter((c) => RAW_CATALOG.some((i) => i.category === c)).map((c) => (
                <optgroup key={c} label={fr.category[c]}>
                  {RAW_CATALOG.filter((i) => i.category === c).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field id="category" label="Catégorie" error={errors.category}>
            <select
              {...describedBy('category', errors.category)}
              className={inputClasses}
              value={values.category}
              onChange={(e) => {
                categoryTouched.current = true
                set('category', e.target.value as Category)
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {fr.category[c]}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-3">
            <Field id="quantity" label="Quantité" optional error={errors.quantity} hint={!errors.quantity && 'Laissez vide si vous ne savez pas.'}>
              <input
                {...describedBy('quantity', errors.quantity, true)}
                className={inputClasses}
                inputMode="decimal"
                value={values.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="ex. 250"
              />
            </Field>
            <div className="w-36 shrink-0">
              <Field id="unit" label="Unité" error={errors.unit}>
                <select {...describedBy('unit', errors.unit)} className={inputClasses} value={values.unit} onChange={(e) => set('unit', e.target.value as InventoryFormValues['unit'])}>
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">État</legend>
            <div className="flex flex-wrap gap-2">
              {/* « Reste cuisiné » : géré dans « Mes restes » depuis la phase 3 (proposé seulement pour un ancien produit). */}
              {STATUSES.filter((s) => s !== 'leftover' || values.status === 'leftover').map((s) => (
                <button key={s} type="button" aria-pressed={values.status === s} className={chip(values.status === s)} onClick={() => set('status', s)}>
                  {fr.status[s]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">
              Rangement <span className="font-normal text-muted">(facultatif)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((l) => (
                <button key={l} type="button" aria-pressed={values.location === l} className={chip(values.location === l)} onClick={() => set('location', l)}>
                  {fr.location[l]}
                </button>
              ))}
              <button type="button" aria-pressed={values.location === ''} className={chip(values.location === '')} onClick={() => set('location', '')}>
                Non précisé
              </button>
            </div>
          </fieldset>
          <Toggle
            id="urgent"
            checked={values.urgent}
            onChange={(v) => set('urgent', v)}
            label="À utiliser en priorité"
            description="Pour signaler un produit à cuisiner vite, même sans date."
          />
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Date sur l’emballage</h2>
            <p className="text-sm text-muted">Facultatif. Renseignez-la seulement si vous l’avez vérifiée : Mijoté ne devine jamais une date.</p>
          </div>
          <Field id="dateKind" label="Type de date" error={errors.dateKind} hint={values.dateKind && DATE_HELP[values.dateKind]}>
            <select
              {...describedBy('dateKind', errors.dateKind, values.dateKind)}
              className={inputClasses}
              value={values.dateKind}
              onChange={(e) => set('dateKind', e.target.value as InventoryFormValues['dateKind'])}
            >
              <option value="">Pas de date</option>
              {DATE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {fr.dateKind[k]}
                </option>
              ))}
            </select>
          </Field>
          {values.dateKind && (
            <Field id="date" label="Date indiquée" error={errors.date}>
              <input {...describedBy('date', errors.date)} type="date" className={inputClasses} value={values.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
          )}
          <div className="flex gap-3">
            <Field id="purchasedOn" label="Acheté le" optional error={errors.purchasedOn}>
              <input {...describedBy('purchasedOn', errors.purchasedOn)} type="date" className={inputClasses} value={values.purchasedOn} onChange={(e) => set('purchasedOn', e.target.value)} />
            </Field>
            <Field id="openedOn" label={values.status === 'leftover' ? 'Préparé le' : 'Ouvert le'} optional error={errors.openedOn}>
              <input {...describedBy('openedOn', errors.openedOn)} type="date" className={inputClasses} value={values.openedOn} onChange={(e) => set('openedOn', e.target.value)} />
            </Field>
          </div>
        </Card>

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            Certains champs sont à corriger avant d’enregistrer.
          </p>
        )}

        <div className="flex gap-2">
          <ButtonLink to="/inventaire" variant="secondary" className="flex-1">
            Annuler
          </ButtonLink>
          <Button type="submit" className="flex-[2]" disabled={saving}>
            {saving ? 'Enregistrement…' : item ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>

        {item && (
          <div className="pt-4">
            {confirmDelete ? (
              <Card className="border-danger/40 bg-danger-soft">
                <p className="font-semibold">Supprimer « {item.name} » de l’inventaire ?</p>
                <p className="text-sm text-muted">Cette action est définitive.</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                  <Button variant="danger" className="flex-1 !bg-danger !text-white" onClick={() => void onDelete()}>
                    Supprimer
                  </Button>
                </div>
              </Card>
            ) : (
              <Button variant="danger" className="w-full" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirmDelete(true)}>
                Supprimer cet ingrédient
              </Button>
            )}
          </div>
        )}
      </form>
    </>
  )
}
