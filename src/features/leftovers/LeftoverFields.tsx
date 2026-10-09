import { Field, describedBy, inputClasses } from '../../components/Field'
import { CATALOG } from '../../data/catalog'
import type { LeftoverFormValues } from '../../domain/schemas'
import { UNITS } from '../../domain/types'
import { fr } from '../../i18n/fr'

const PREPARED = CATALOG.filter((i) => i.category === 'prepared')

interface Props {
  values: LeftoverFormValues
  errors: Record<string, string>
  set: <K extends keyof LeftoverFormValues>(key: K, value: LeftoverFormValues[K]) => void
  /** Préfixe des identifiants HTML (évite les doublons si le formulaire est inclus dans une autre page). */
  idPrefix?: string
}

/** Champs d'un reste : partagés par l'ajout manuel et la fin de préparation d'une recette. */
export function LeftoverFields({ values, errors, set, idPrefix = 'leftover' }: Props) {
  const id = (k: string) => `${idPrefix}-${k}`
  return (
    <div className="space-y-4">
      <Field id={id('name')} label="Ce que contient ce reste" error={errors.name}>
        <input
          {...describedBy(id('name'), errors.name)}
          className={inputClasses}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="ex. Reste de riz, soupe de légumes…"
          autoComplete="off"
        />
      </Field>

      <Field
        id={id('ingredientId')}
        label="Réutilisable dans les recettes comme"
        hint={
          values.ingredientId
            ? 'Mijoté pourra proposer des recettes qui utilisent ce reste cuisiné.'
            : 'Aucun : le reste est suivi, mais pas proposé dans les recettes.'
        }
      >
        <select {...describedBy(id('ingredientId'), undefined, true)} className={inputClasses} value={values.ingredientId} onChange={(e) => set('ingredientId', e.target.value)}>
          <option value="">Aucun (plat préparé)</option>
          {PREPARED.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <Field id={id('quantity')} label="Quantité conservée" error={errors.quantity} hint={!errors.quantity && 'Pesée ou comptée par vous.'}>
          <input
            {...describedBy(id('quantity'), errors.quantity, true)}
            className={inputClasses}
            inputMode="decimal"
            value={values.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            placeholder="ex. 2"
          />
        </Field>
        <div className="w-36 shrink-0">
          <Field id={id('unit')} label="Unité" error={errors.unit}>
            <select {...describedBy(id('unit'), errors.unit)} className={inputClasses} value={values.unit} onChange={(e) => set('unit', e.target.value as LeftoverFormValues['unit'])}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Field id={id('preparedOn')} label="Préparé le" error={errors.preparedOn} hint="Ce n’est pas une date limite.">
        <input {...describedBy(id('preparedOn'), errors.preparedOn, true)} type="date" className={inputClasses} value={values.preparedOn} onChange={(e) => set('preparedOn', e.target.value)} />
      </Field>

      <Field
        id={id('limitKind')}
        label="Date limite que vous fixez"
        error={errors.limitKind}
        hint="Facultatif. Mijoté ne calcule jamais de durée de conservation à votre place."
      >
        <select
          {...describedBy(id('limitKind'), errors.limitKind, true)}
          className={inputClasses}
          value={values.limitKind}
          onChange={(e) => set('limitKind', e.target.value as LeftoverFormValues['limitKind'])}
        >
          <option value="">Pas de date limite</option>
          <option value="use-by">{fr.leftoverLimit['use-by']}</option>
          <option value="best-before">{fr.leftoverLimit['best-before']}</option>
        </select>
      </Field>
      {values.limitKind && (
        <Field id={id('limitDate')} label="À consommer avant le" error={errors.limitDate}>
          <input {...describedBy(id('limitDate'), errors.limitDate)} type="date" className={inputClasses} value={values.limitDate} onChange={(e) => set('limitDate', e.target.value)} />
        </Field>
      )}

      <Field id={id('note')} label="Note" optional error={errors.note}>
        <input
          {...describedBy(id('note'), errors.note)}
          className={inputClasses}
          value={values.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="ex. boîte en verre, sans sauce…"
        />
      </Field>
    </div>
  )
}
