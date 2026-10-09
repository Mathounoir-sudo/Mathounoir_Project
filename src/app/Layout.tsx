import { NavLink, Outlet } from 'react-router'
import { UpdatePrompt } from './UpdatePrompt'

const TABS = [
  { to: '/', label: 'Garde-manger', icon: '🧺', end: true },
  { to: '/recettes', label: 'Recettes', icon: '🍲', end: false },
  { to: '/reglages', label: 'Réglages', icon: '⚙️', end: false },
]

export function Layout() {
  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>
      <UpdatePrompt />
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className="tab">
            <span aria-hidden="true" className="tab-icon">
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
