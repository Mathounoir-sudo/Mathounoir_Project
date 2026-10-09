# Mijoté 🍲

> Nom provisoire, non vérifié sur le plan des marques.

Application web mobile **installable** (PWA) de cuisine anti-gaspillage pour les personnes seules ou en couple :
**« Cuisinez quelque chose de bon avec ce que vous avez déjà. »**

Inventaire → Priorités → Recette faisable → Cuisiner → Restes → Recommencer.

## État actuel : phase 1 (fondations)

| Fonctionnalité | État |
|---|---|
| Accueil : ingrédients suivis, priorités, actions principales, recettes | ✅ |
| Inventaire : ajouter, rechercher dans le catalogue, modifier, supprimer, + / −, vue par catégorie ou par priorité | ✅ |
| État (non entamé, entamé, reste cuisiné, congelé), rangement, dates d'achat / d'ouverture | ✅ |
| Dates DLC / DDM / « type inconnu », jamais devinées | ✅ |
| Priorités anti-gaspi expliquées (raison affichée pour chaque produit) | ✅ |
| Basiques (sel, huile…) confirmés explicitement, jamais supposés | ✅ |
| Recettes de démonstration validées (Zod), disponibilité réelle, mode « uniquement ce que j'ai » | ✅ |
| Détail recette : portions, préparation, cuisson, total, quantités, étapes, sécurité, conservation | ✅ |
| Recettes enregistrées (favoris) | ✅ |
| Sauvegarde / restauration JSON, données de démo retirables | ✅ |
| Hors connexion, installable, mise à jour signalée | ✅ |
| **Reconnaissance photo** | ⏳ Non configurée : l'écran l'explique et propose la saisie manuelle |
| **Génération de recettes par IA** | ⏳ Non configurée : 12 recettes de démonstration fixes |
| Réglage des portions, mode cuisine, minuteurs, suivi des restes et historique des mouvements | ⏳ Phase 2 |
| Exclusions / allergies | ⏳ Phase 2 |
| Compte, synchronisation (Supabase) | ⏳ Phase 4 |

Aucune clé d'API, aucun compte, aucun serveur : tout est stocké sur l'appareil (IndexedDB).

## Lancer l'application

Prérequis : **Node.js 22.12 ou plus** (`node --version`).

```bash
npm install          # une seule fois : installe les dépendances
npm run dev          # lance l'app : ouvrez l'adresse affichée (http://localhost:5173)
```

Pour l'essayer sur un téléphone du même réseau Wi-Fi : `npm run dev -- --host`, puis ouvrez l'adresse
« Network » affichée. (L'installation comme application et le mode hors connexion ne fonctionnent
qu'en HTTPS, donc une fois l'app déployée.)

Pour essayer la version de production en local :

```bash
npm run build && npm run preview   # http://localhost:4173
```

## Tester

```bash
npm run check   # tout : lint + vérification TypeScript + tests unitaires + build
npm test        # tests unitaires uniquement (Vitest)
npm run e2e     # parcours complets dans un vrai navigateur (Playwright)
```

Si Playwright n'a pas encore de navigateur sur votre machine : `npx playwright install chromium` (une fois).

## Organisation du code

```
src/
├─ app/            démarrage, navigation, écran si le stockage est bloqué, mise à jour PWA
├─ components/     composants d'interface réutilisables et accessibles (boutons, champs, messages…)
├─ features/       un dossier par écran : home, inventory, recipes, photo-recognition, settings
├─ domain/         règles métier pures, sans React, testées :
│                  priorités et sécurité (priority.ts), recettes faisables (matching.ts),
│                  quantités, dates, validation Zod (schemas.ts), sauvegarde, migrations
├─ services/       accès aux données (inventaire, recettes, préférences, sauvegarde)
├─ lib/            base locale Dexie, messages d'erreur compréhensibles
├─ hooks/          lecture des données en temps réel
├─ data/           catalogue d'ingrédients, recettes et ingrédients de démonstration
├─ i18n/           libellés français (une autre langue = un autre fichier)
└─ styles/         Tailwind CSS et couleurs (clair / sombre)
e2e/               parcours utilisateur testés dans Chromium
```

### Règles importantes

- **Sécurité alimentaire** : seule une DLC dépassée déclenche « Ne pas consommer » ; une DDM dépassée n'est pas
  traitée comme une DLC ; une date de type inconnu dépassée demande une vérification. Les produits concernés ne sont
  jamais proposés dans les recettes. L'app ne juge jamais la fraîcheur d'un produit.
- **Rien n'est inventé** : pas de date, quantité ou valeur nutritionnelle devinée ; sans information, la priorité
  est affichée comme « incertaine ».
- **Recettes** : validées par `recipeSchema` avant affichage ; une recette invalide est écartée sans faire planter l'app.
  « Rien à acheter » n'est affiché que si chaque ingrédient obligatoire est présent en quantité suffisante.
- **Base locale** : pour changer la structure, ajouter une nouvelle version Dexie avec migration
  (voir `src/lib/db.ts`) ; ne jamais modifier une version existante.

### Ajouter une recette de démonstration

Éditer `src/data/demo-recipes.ts`. Chaque `ingredientId` doit exister dans `src/data/catalog.ts` ;
les tests vérifient le schéma et les identifiants.

## Déploiement

Le workflow `.github/workflows/deploy.yml` publie sur GitHub Pages à chaque mise à jour de `main`.
Activation, une seule fois : **Settings → Pages → Source : « GitHub Actions »**.

⚠️ Les données des utilisateurs sont liées à l'adresse exacte de l'app : changer d'adresse leur ferait perdre
leur inventaire (sauf export / import).
