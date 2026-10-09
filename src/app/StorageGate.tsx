import { useEffect, useState, type ReactNode } from 'react'
import { DatabaseZap } from 'lucide-react'
import { db } from '../lib/db'

/**
 * Ouvre la base locale avant d'afficher l'application.
 * Si le navigateur bloque le stockage, on l'explique au lieu d'afficher une page cassée.
 */
export function StorageGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    db.open().then(
      () => setState('ready'),
      (error) => {
        console.error(error)
        setState('error')
      },
    )
  }, [])

  if (state === 'ready') return children
  if (state === 'loading') return <div className="min-h-dvh bg-bg" aria-busy="true" />
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <DatabaseZap className="size-10 text-accent" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Stockage local indisponible</h1>
      <p className="text-muted">
        Mijoté enregistre vos ingrédients sur cet appareil, mais le navigateur l’empêche (navigation privée, stockage
        désactivé ou espace plein). Essayez dans une fenêtre normale, ou libérez de l’espace, puis rechargez.
      </p>
      <button type="button" className="min-h-11 rounded-full bg-primary px-5 font-semibold text-on-primary" onClick={() => window.location.reload()}>
        Réessayer
      </button>
    </div>
  )
}
