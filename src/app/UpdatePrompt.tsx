import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

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

  if (needRefresh) {
    return (
      <div className="toast" role="status">
        <span>Une nouvelle version de Mijoté est disponible.</span>
        <button className="btn btn-small" onClick={() => void updateServiceWorker(true)}>
          Mettre à jour
        </button>
        <button className="btn btn-small btn-ghost" onClick={() => setNeedRefresh(false)}>
          Plus tard
        </button>
      </div>
    )
  }
  if (offlineReady) {
    return (
      <div className="toast" role="status">
        <span>Mijoté fonctionne maintenant hors connexion.</span>
        <button className="btn btn-small btn-ghost" onClick={() => setOfflineReady(false)}>
          OK
        </button>
      </div>
    )
  }
  return null
}
