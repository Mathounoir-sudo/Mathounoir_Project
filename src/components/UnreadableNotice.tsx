import { TriangleAlert } from 'lucide-react'
import { useStoredInventory, useStoredLeftovers } from '../hooks/useData'

/** Signale les ingrédients (ou restes) enregistrés que cette version ne sait pas lire (ils restent stockés, rien n'est supprimé). */
export function UnreadableNotice({ source = 'inventory' }: { source?: 'inventory' | 'leftovers' }) {
  const inventory = useStoredInventory()?.unreadable
  const leftovers = useStoredLeftovers()?.unreadable
  const unreadable = (source === 'inventory' ? inventory : leftovers) ?? []
  const noun = source === 'inventory' ? 'ingrédient' : 'reste'
  if (unreadable.length === 0) return null
  const n = unreadable.length
  return (
    <div role="status" className="mb-5 rounded-3xl border border-warn/40 bg-warn-soft p-4 text-sm">
      <p className="flex items-start gap-2 font-semibold text-warn">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {n > 1
          ? `${n} ${noun}s enregistrés n’ont pas pu être lus et ne sont pas affichés.`
          : `1 ${noun} enregistré n’a pas pu être lu et n’est pas affiché.`}
      </p>
      <p className="mt-1">
        {n > 1 ? 'Ils restent' : 'Il reste'} stocké{n > 1 ? 's' : ''} sur cet appareil : rien n’a été supprimé ni modifié.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold">Détails techniques</summary>
        <ul className="mt-1 space-y-1 break-words font-mono text-xs">
          {unreadable.map((u, i) => (
            <li key={`${u.id}-${i}`}>
              {u.name} ({u.id}) — {u.problem}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
