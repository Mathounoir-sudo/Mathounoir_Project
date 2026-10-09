import { useEffect, useRef, useState } from 'react'
import { getAllPantry, replacePantry } from '../../data/db'
import { isStoragePersisted, requestPersistentStorage } from '../../data/storage'
import { createBackup, parseBackup } from '../../domain/backup'
import { todayISO } from '../../domain/dates'
import { PageHeader } from '../../ui/PageHeader'

export function SettingsPage() {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  async function exportData() {
    const backup = createBackup(await getAllPantry())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mijote-sauvegarde-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: `${backup.pantry.length} produit(s) exporté(s).` })
  }

  async function importData(file: File) {
    try {
      const backup = parseBackup(await file.text())
      if (!confirm(`Remplacer votre garde-manger actuel par les ${backup.pantry.length} produit(s) de la sauvegarde ?`)) return
      await replacePantry(backup.pantry)
      setMessage({ kind: 'ok', text: `${backup.pantry.length} produit(s) restauré(s).` })
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Import impossible.' })
    }
  }

  async function clearAll() {
    if (!confirm('Supprimer définitivement tout le garde-manger ? Pensez à exporter une sauvegarde avant.')) return
    await replacePantry([])
    setMessage({ kind: 'ok', text: 'Garde-manger vidé.' })
  }

  return (
    <>
      <PageHeader title="Réglages" />

      {message && (
        <p className={`notice notice-${message.kind}`} role="status">
          {message.text}
        </p>
      )}

      <section className="card">
        <h2>Mes données</h2>
        <p className="muted">
          Vos données restent uniquement sur cet appareil : pas de compte, rien n'est envoyé sur internet. Exportez
          régulièrement une sauvegarde pour ne rien perdre (changement de téléphone, nettoyage du navigateur…).
        </p>
        <div className="stack">
          <button className="btn" onClick={() => void exportData()}>
            Exporter une sauvegarde
          </button>
          <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
            Restaurer une sauvegarde…
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importData(file)
              e.target.value = ''
            }}
          />
        </div>
        <p className="muted small">
          Protection contre l'effacement automatique :{' '}
          {persisted === null ? 'non prise en charge par ce navigateur' : persisted ? 'activée ✓' : 'non accordée'}
          {persisted === false && (
            <>
              {' '}
              <button
                className="link"
                onClick={() => void requestPersistentStorage().then(setPersisted)}
              >
                Demander
              </button>
              <br />
              Astuce : installer Mijoté sur l'écran d'accueil augmente les chances qu'elle soit accordée.
            </>
          )}
        </p>
      </section>

      <section className="card">
        <h2>Installer l'application</h2>
        <p className="muted">
          <strong>Android (Chrome)</strong> : menu ⋮ → « Installer l'application ».
          <br />
          <strong>iPhone (Safari)</strong> : bouton Partager → « Sur l'écran d'accueil ».
        </p>
      </section>

      <section className="card">
        <h2>Zone dangereuse</h2>
        <button className="btn btn-danger" onClick={() => void clearAll()}>
          Vider le garde-manger
        </button>
      </section>

      <p className="muted small center">Mijoté v{__APP_VERSION__}</p>
    </>
  )
}
