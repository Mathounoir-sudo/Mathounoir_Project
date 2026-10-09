import { NavLink } from 'react-router'
import { useAvailableLeftovers } from '../../hooks/useData'

/** Onglets de l'écran Inventaire : ingrédients bruts / restes cuisinés (deux listes distinctes). */
export function InventoryTabs() {
  const leftovers = useAvailableLeftovers()
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-10 flex-1 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
      isActive ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
    }`
  return (
    <nav aria-label="Sections de l’inventaire" className="mb-5 flex gap-1 rounded-full bg-line/50 p-1">
      <NavLink to="/inventaire" end className={tab}>
        Ingrédients
      </NavLink>
      <NavLink to="/inventaire/restes" className={tab}>
        Mes restes{leftovers && leftovers.length > 0 ? ` (${leftovers.length})` : ''}
      </NavLink>
    </nav>
  )
}
