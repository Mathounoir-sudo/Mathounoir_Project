import { Link } from 'react-router'
import { ChevronRight, Clock, Leaf, Users } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { describeLine, type Recommendation, type RecipeEvaluation } from '../../domain/recipe-engine'
import { FEASIBILITY } from './labels'

interface Props {
  evaluation: RecipeEvaluation
  /** Explications du moteur ; absentes en vue compacte. */
  reasons?: Recommendation['reasons']
  compact?: boolean
}

/** Carte de recette : temps, portions, faisabilité et, en vue complète, le détail de ce qui manque et pourquoi. */
export function RecipeCard({ evaluation: e, reasons, compact = false }: Props) {
  const { recipe } = e
  const status = FEASIBILITY[e.feasibility]
  const available = e.lines.filter((l) => !l.optional && (l.status === 'available' || l.status === 'substituted'))
  const insufficient = e.toBuy.filter((l) => l.status === 'insufficient')
  const missing = e.toBuy.filter((l) => l.status === 'missing')
  return (
    <Link
      to={`/recettes/${recipe.id}`}
      className="flex items-start gap-3 rounded-3xl border border-line bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-lg font-semibold leading-snug">{recipe.title}</p>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden="true" />
            {recipe.prepMinutes} min de prép. · {recipe.cookMinutes} min de cuisson · {e.totalMinutes} min au total
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-4" aria-hidden="true" />
            {e.servings} {e.servings > 1 ? 'portions' : 'portion'}
          </span>
        </p>
        {compact ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted">{recipe.description}</p>
        ) : (
          <>
            <p className="mt-2 text-sm">{recipe.description}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              {available.length > 0 && <Row term="Déjà là" tone="text-ok" items={available.map((l) => l.name.toLocaleLowerCase('fr-FR'))} />}
              {missing.length > 0 && <Row term="À acheter" tone="text-accent" items={missing.map(describeLine)} />}
              {insufficient.length > 0 && <Row term="Pas assez" tone="text-accent" items={insufficient.map(describeLine)} />}
              {e.toConfirm.length > 0 && <Row term="À confirmer" tone="text-warn" items={e.toConfirm.map(describeLine)} />}
            </dl>
            {e.priorityItems.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-sm">
                <Leaf className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="font-semibold">À écouler : </span>
                  {e.priorityItems.map((p) => p.item.name).join(', ')}
                </span>
              </p>
            )}
            {reasons && reasons.length > 0 && (
              <div className="mt-3 rounded-2xl bg-primary-soft/60 px-3 py-2 text-sm">
                <p className="font-semibold text-primary">Pourquoi cette recette ?</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      <ChevronRight className="mt-1 size-5 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  )
}

function Row({ term, items, tone }: { term: string; items: string[]; tone: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className={`shrink-0 font-semibold ${tone}`}>{term} :</dt>
      <dd>{items.join(', ')}</dd>
    </div>
  )
}
