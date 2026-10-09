import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface State {
  error: unknown
  /** Composants React où l'erreur s'est produite (pour le diagnostic). */
  where: string | null
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name} : ${error.message}`
  return String(error)
}

/**
 * Affiche un écran de secours compréhensible au lieu d'une page blanche. Les données locales ne sont pas touchées.
 * Le détail technique reste consultable pour pouvoir diagnostiquer la cause exacte.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, where: null }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error ?? new Error('Erreur inconnue') }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error)
    const where = info.componentStack
      ?.split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join('\n')
    this.setState({ where: where || null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const details = [describe(this.state.error), this.state.where].filter(Boolean).join('\n\n')
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
        <details className="w-full text-left text-sm">
          <summary className="cursor-pointer text-center font-semibold text-muted">Détails techniques</summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-card p-3 text-xs ring-1 ring-line">
            {details}
          </pre>
        </details>
      </div>
    )
  }
}
