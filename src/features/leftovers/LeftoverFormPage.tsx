import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { SearchX, Trash2 } from 'lucide-react'
import { Button, ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../components/Toast'
import { db } from '../../lib/db'
import { readStoredLeftovers } from '../../domain/leftovers'
import { todayISO } from '../../domain/dates'
import { fieldErrors, leftoverFormSchema, type LeftoverFormValues } from '../../domain/schemas'
import type { Leftover } from '../../domain/types'
import { addLeftover, deleteLeftover, suggestLeftoverLink, updateLeftover } from '../../services/leftovers'
import { LeftoverFields } from './LeftoverFields'

export function toLeftoverValues(l?: Leftover): LeftoverFormValues {
  return {
    name: l?.name ?? '',
    ingredientId: l?.ingredientId ?? '',
    quantity: l?.quantity?.toString().replace('.', ',') ?? '',
    unit: l?.unit ?? 'portion',
    preparedOn: l?.preparedOn ?? todayISO(),
    limitKind: l?.limit?.kind ?? '',
    limitDate: l?.limit?.date ?? '',
    note: l?.note ?? '',
  }
}

export function LeftoverFormPage() {
  const { id } = useParams()
  const loaded = useLiveQuery(async () => {
    if (!id) return { leftover: undefined, problem: null }
    const raw = await db.leftovers.get(id)
    if (raw === undefined) return { leftover: undefined, problem: null }
    const { leftovers, unreadable } = readStoredLeftovers([raw])
    return { leftover: leftovers[0], problem: unreadable[0]?.problem ?? null }
  }, [id])

  if (loaded === undefined) return <div aria-busy="true" />
  if (id && !loaded.leftover) {
    return (
      <>
        <PageHeader title="Reste introuvable" back={{ to: '/inventaire/restes', label: 'Mes restes' }} />
        <EmptyState icon={<SearchX className="size-7" />} title={loaded.problem ? 'Ce reste ne peut pas être ouvert' : 'Ce reste n’existe plus'} actions={<ButtonLink to="/inventaire/restes">Retour à mes restes</ButtonLink>}>
          {loaded.problem ? `Son enregistrement n’a pas le format attendu (${loaded.problem}). Il reste stocké, rien n’a été modifié.` : 'Il a peut-être été supprimé.'}
        </EmptyState>
      </>
    )
  }
  return <LeftoverForm key={id ?? 'new'} leftover={loaded.leftover} />
}

function LeftoverForm({ leftover }: { leftover?: Leftover }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState<LeftoverFormValues>(() => toLeftoverValues(leftover))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const linkTouched = useRef(Boolean(leftover))
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof LeftoverFormValues>(key: K, value: LeftoverFormValues[K]) => {
    setValues((v) => {
      const next = { ...v, [key]: value }
      // Ingrédient cuisiné proposé d'après le nom, tant que l'utilisateur ne l'a pas choisi.
      if (key === 'name' && !linkTouched.current) next.ingredientId = suggestLeftoverLink(String(value)) ?? ''
      return next
    })
    if (key === 'ingredientId') linkTouched.current = true
    if (errors[key])
      setErrors((e) => {
        const next = { ...e }
        delete next[key]
        return next
      })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = leftoverFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    const ok = await toast.run(async () => {
      if (leftover) await updateLeftover(leftover.id, parsed.data)
      else await addLeftover(parsed.data)
      return true
    }, leftover ? 'Reste mis à jour.' : `« ${parsed.data.name} » ajouté à vos restes.`)
    setSaving(false)
    if (ok) navigate('/inventaire/restes')
  }

  return (
    <>
      <PageHeader title={leftover ? 'Modifier le reste' : 'Ajouter un reste'} back={{ to: '/inventaire/restes', label: 'Mes restes' }} />
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
        <Card>
          <LeftoverFields values={values} errors={errors} set={set} />
        </Card>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            Certains champs sont à corriger avant d’enregistrer.
          </p>
        )}
        <div className="flex gap-2">
          <ButtonLink to="/inventaire/restes" variant="secondary" className="flex-1">
            Annuler
          </ButtonLink>
          <Button type="submit" className="flex-[2]" disabled={saving}>
            {saving ? 'Enregistrement…' : leftover ? 'Enregistrer' : 'Ajouter le reste'}
          </Button>
        </div>
        {leftover && (
          <div className="pt-4">
            {confirmDelete ? (
              <Card className="border-danger/40 bg-danger-soft">
                <p className="font-semibold">Supprimer « {leftover.name} » ?</p>
                <p className="text-sm text-muted">
                  Il disparaîtra aussi de l’historique. Pour garder une trace, marquez-le plutôt comme mangé ou jeté.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 !bg-danger !text-white"
                    onClick={() =>
                      void toast
                        .run(async () => {
                          await deleteLeftover(leftover.id)
                          return true
                        }, `« ${leftover.name} » supprimé.`)
                        .then((ok) => ok && navigate('/inventaire/restes'))
                    }
                  >
                    Supprimer
                  </Button>
                </div>
              </Card>
            ) : (
              <Button variant="danger" className="w-full" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirmDelete(true)}>
                Supprimer ce reste
              </Button>
            )}
          </div>
        )}
      </form>
    </>
  )
}
