import { useEffect, useRef, useState } from 'react'
import { Download, Sparkles, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../components/Toast'
import { db } from '../../lib/db'
import { isStoragePersisted, requestPersistentStorage } from '../../lib/storage'
import { exportBackup, readBackup, restoreBackup } from '../../services/backup'
import { clearInventory, loadDemoInventory, removeDemoInventory } from '../../services/inventory'
import { setStaples } from '../../services/preferences'
import type { Backup } from '../../domain/backup'

export function SettingsPage() {
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const counts = useLiveQuery(async () => ({
    total: await db.pantry.count(),
    demo: await db.pantry.filter((i) => i.source === 'demo').count(),
  }))

  useEffect(() => {
    void isStoragePersisted().then(setPersisted, () => setPersisted(null))
  }, [])

  async function onExport() {
    await toast.run(async () => {
      const { filename, json, count } = await exportBackup()
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Sauvegarde téléchargée (${count} ingrédient${count > 1 ? 's' : ''}).`)
    })
  }

  async function onFile(file: File) {
    await toast.run(async () => setPending(readBackup(await file.text())))
  }

  async function onRestore() {
    if (!pending) return
    const backup = pending
    setPending(null)
    await toast.run(() => restoreBackup(backup), `Sauvegarde restaurée : ${backup.inventory.length} ingrédient(s).`)
  }

  async function onClearAll() {
    setConfirmClear(false)
    await toast.run(async () => {
      await clearInventory()
      await setStaples([])
      await db.favorites.clear()
    }, 'Toutes vos données ont été effacées de cet appareil.')
  }

  return (
    <>
      <PageHeader title="Réglages" />

      <Card>
        <h2 className="text-lg font-semibold">Mes données</h2>
        <p className="mt-1 text-sm text-muted">
          Tout reste sur cet appareil : pas de compte, rien n’est envoyé sur internet. Exportez une sauvegarde de temps en
          temps pour ne rien perdre (changement de téléphone, nettoyage du navigateur…).
        </p>
        <div className="mt-4 grid gap-2">
          <Button icon={<Download className="size-4" aria-hidden="true" />} onClick={() => void onExport()}>
            Exporter une sauvegarde
          </Button>
          <Button variant="secondary" icon={<Upload className="size-4" aria-hidden="true" />} onClick={() => fileInput.current?.click()}>
            Restaurer une sauvegarde…
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {pending && (
          <div className="mt-4 rounded-2xl bg-warn-soft p-4" role="alertdialog" aria-label="Confirmer la restauration">
            <p className="font-semibold">
              Remplacer vos {counts?.total ?? 0} ingrédient(s) actuels par les {pending.inventory.length} de la sauvegarde ?
            </p>
            <p className="text-sm text-muted">Vos basiques et recettes enregistrées seront aussi remplacés.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPending(null)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={() => void onRestore()}>
                Remplacer
              </Button>
            </div>
          </div>
        )}
        <p className="mt-4 text-sm text-muted">
          Protection contre l’effacement automatique :{' '}
          <strong className="text-ink">{persisted === null ? 'non prise en charge par ce navigateur' : persisted ? 'activée' : 'non accordée'}</strong>
          {persisted === false && (
            <>
              {' · '}
              <button type="button" className="font-semibold text-primary underline" onClick={() => void requestPersistentStorage().then(setPersisted)}>
                Demander
              </button>
              <span className="block">Installer Mijoté sur l’écran d’accueil augmente les chances qu’elle soit accordée.</span>
            </>
          )}
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Données de démonstration</h2>
        <p className="mt-1 text-sm text-muted">
          Des ingrédients fictifs pour essayer l’application. Ils sont marqués « Démo » et peuvent être retirés sans toucher
          à vos propres ingrédients.
        </p>
        <div className="mt-4 grid gap-2">
          <Button variant="secondary" icon={<Sparkles className="size-4" aria-hidden="true" />} onClick={() => void toast.run(loadDemoInventory, 'Ingrédients fictifs ajoutés.')}>
            Ajouter les ingrédients de démo
          </Button>
          {(counts?.demo ?? 0) > 0 && (
            <Button
              variant="danger"
              onClick={() => void toast.run(removeDemoInventory, `${counts?.demo} ingrédient(s) de démo retiré(s).`)}
            >
              Retirer les {counts?.demo} ingrédients de démo
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">Installer l’application</h2>
        <p className="mt-1 text-sm text-muted">
          <strong className="text-ink">Android (Chrome)</strong> : menu ⋮ → « Installer l’application ».
          <br />
          <strong className="text-ink">iPhone (Safari)</strong> : bouton Partager → « Sur l’écran d’accueil ».
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold">État des fonctionnalités</h2>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li>
            <strong>Reconnaissance photo :</strong> <span className="text-muted">non configurée</span>
          </li>
          <li>
            <strong>Génération de recettes par IA :</strong> <span className="text-muted">non configurée (recettes de démonstration)</span>
          </li>
          <li>
            <strong>Compte et synchronisation :</strong> <span className="text-muted">non disponibles (données locales uniquement)</span>
          </li>
        </ul>
      </Card>

      <Card className="mt-4 border-danger/30">
        <h2 className="text-lg font-semibold">Zone sensible</h2>
        {confirmClear ? (
          <div className="mt-2">
            <p className="font-semibold">Effacer définitivement l’inventaire, les basiques et les recettes enregistrées ?</p>
            <p className="text-sm text-muted">Pensez à exporter une sauvegarde avant.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
                Annuler
              </Button>
              <Button variant="danger" className="flex-1 !bg-danger !text-white" onClick={() => void onClearAll()}>
                Tout effacer
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" className="mt-3 w-full" icon={<Trash2 className="size-4" aria-hidden="true" />} onClick={() => setConfirmClear(true)}>
            Effacer toutes mes données
          </Button>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-muted">Mijoté v{__APP_VERSION__} · nom provisoire</p>
    </>
  )
}
