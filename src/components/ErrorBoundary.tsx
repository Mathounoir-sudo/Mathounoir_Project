import { Component, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface State {
  error: Error | null
}

/** Affiche un écran de secours compréhensible au lieu d'une page blanche. Les données locales ne sont pas touchées. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <TriangleAlert className="size-10 text-accent" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Oups, un problème d’affichage</h1>
        <p className="text-muted">
          Mijoté a rencontré une erreur inattendue. Vos ingrédients enregistrés sur cet appareil n’ont pas été effacés.
        </p>
        <button
          type="button"
          className="min-h-11 rounded-full bg-primary px-5 font-semibold text-on-primary"
          onClick={() => {
            window.location.hash = '#/'
            window.location.reload()
          }}
        >
          Recharger l’application
        </button>
      </div>
    )
  }
}
