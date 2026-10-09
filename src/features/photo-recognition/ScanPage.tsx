import { Camera, Check, Plus } from 'lucide-react'
import { ButtonLink } from '../../components/Button'
import { Card } from '../../components/Card'
import { PageHeader } from '../../components/PageHeader'

/**
 * Phase 1 : la reconnaissance photo n'est PAS active. Cet écran l'indique clairement
 * et propose la saisie manuelle à la place (aucune photo n'est prise ni envoyée).
 */
export function ScanPage() {
  return (
    <>
      <PageHeader title="Scanner mon frigo" back={{ to: '/', label: 'Accueil' }} />

      <Card className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
          <Camera className="size-7" />
        </div>
        <p className="font-display text-xl font-semibold">Reconnaissance photo pas encore disponible</p>
        <p className="mt-2 text-muted">
          Cette fonction n’est pas configurée dans cette version : elle nécessite un service d’intelligence artificielle
          côté serveur. Aucune photo n’est prise ni envoyée.
        </p>
        <ButtonLink to="/inventaire/nouveau" size="lg" className="mt-5 w-full" icon={<Plus className="size-5" aria-hidden="true" />}>
          Ajouter mes ingrédients à la main
        </ButtonLink>
      </Card>

      <h2 className="mb-2 mt-7 text-lg font-semibold">Ce qu’elle fera</h2>
      <ul className="space-y-2 text-[15px]">
        {[
          'Proposer une liste d’ingrédients visibles sur la photo.',
          'Vous laisser vérifier, corriger ou retirer chaque proposition avant tout enregistrement.',
          'Ne jamais deviner une quantité exacte, une date limite ni la fraîcheur d’un produit.',
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <Check className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
    </>
  )
}
