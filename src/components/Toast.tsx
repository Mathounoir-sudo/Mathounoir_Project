import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { UserFacingError } from '../lib/errors'

interface Toast {
  id: number
  kind: 'success' | 'error'
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (error: unknown) => void
  /** Exécute une action et affiche son erreur éventuelle de façon compréhensible. Renvoie undefined en cas d'échec. */
  run: <T>(action: () => Promise<T>, successMessage?: string) => Promise<T | undefined>
}

const ToastContext = createContext<ToastApi | null>(null)

function messageOf(error: unknown): string {
  if (error instanceof UserFacingError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Une erreur inattendue est survenue. Vos données n’ont pas été modifiées.'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback(
    (kind: Toast['kind'], message: string) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-2), { id, kind, message }])
      // Les erreurs restent plus longtemps à l'écran.
      setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => {
    const success = (message: string) => push('success', message)
    const error = (e: unknown) => push('error', messageOf(e))
    return {
      success,
      error,
      run: async (action, successMessage) => {
        try {
          const result = await action()
          if (successMessage) success(successMessage)
          return result
        } catch (e) {
          error(e)
          return undefined
        }
      },
    }
  }, [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.kind === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg'
            }`}
          >
            {t.kind === 'error' ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Fermer le message" className="-m-1 p-1 opacity-80 hover:opacity-100">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>')
  return ctx
}
