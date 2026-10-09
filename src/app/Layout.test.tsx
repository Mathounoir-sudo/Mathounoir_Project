import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Layout } from './Layout'

// Le service worker n'existe pas dans les tests.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: async () => {} }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Layout', () => {
  it('change d’écran sans planter quand scrollTo renvoie une valeur (ex. une Promise)', async () => {
    // Certains navigateurs (ou extensions) font renvoyer une Promise à scrollTo.
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation((() => Promise.resolve()) as never)
    const router = createMemoryRouter(
      [
        {
          element: <Layout />,
          children: [
            { path: '/', element: <p>Écran accueil</p> },
            { path: '/inventaire', element: <p>Écran inventaire</p> },
            { path: '/recettes', element: <p>Écran recettes</p> },
          ],
        },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByText('Écran accueil')).toBeTruthy()

    // Le changement d'écran exécute le nettoyage de l'effet précédent : c'est là que l'erreur survenait.
    await act(() => router.navigate('/inventaire'))
    expect(screen.getByText('Écran inventaire')).toBeTruthy()
    await act(() => router.navigate('/recettes'))
    expect(screen.getByText('Écran recettes')).toBeTruthy()
    expect(scrollTo).toHaveBeenCalledTimes(3)
  })
})
