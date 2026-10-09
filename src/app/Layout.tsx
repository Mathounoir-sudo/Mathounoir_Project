import { NavLink, Outlet, useLocation } from 'react-router'
import { useEffect } from 'react'
import { ChefHat, House, Refrigerator, Settings } from 'lucide-react'
import { UpdatePrompt } from './UpdatePrompt'

const TABS = [
  { to: '/', label: 'Accueil', icon: House, end: true },
  { to: '/inventaire', label: 'Inventaire', icon: Refrigerator, end: false },
  { to: '/recettes', label: 'Recettes', icon: ChefHat, end: false },
  { to: '/reglages', label: 'Réglages', icon: Settings, end: false },
]

export function Layout() {
  const { pathname } = useLocation()
  // Chaque nouvel écran s'ouvre en haut de page.
  // Accolades obligatoires : un effet ne doit renvoyer qu'une fonction de nettoyage (ou rien).
  // Renvoyer le résultat de scrollTo (une Promise dans certains navigateurs) fait planter React
  // au changement d'écran : « TypeError: destroy is not a function ».
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <main id="contenu" className="mx-auto max-w-xl px-4 pb-[calc(112px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <UpdatePrompt />
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-primary' : 'text-muted'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`flex h-7 w-14 items-center justify-center rounded-full ${isActive ? 'bg-primary-soft' : ''}`}>
                      <Icon className="size-5" aria-hidden="true" strokeWidth={isActive ? 2.25 : 1.75} />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
