import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '../components/Button'

/** Prévient l'utilisateur quand une nouvelle version de l'app est disponible. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  // Le message « hors connexion » est purement informatif : il disparaît tout seul.
  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm text-bg shadow-lg"
    >
      <span className="flex-1 basis-full">
        {needRefresh ? 'Une nouvelle version de Mijoté est disponible.' : 'Mijoté fonctionne maintenant hors connexion.'}
      </span>
      {needRefresh && (
        <Button size="sm" variant="accent" onClick={() => void updateServiceWorker(true)}>
          Mettre à jour
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="!text-bg"
        onClick={() => (needRefresh ? setNeedRefresh(false) : setOfflineReady(false))}
      >
        {needRefresh ? 'Plus tard' : 'OK'}
      </Button>
    </div>
  )
}
