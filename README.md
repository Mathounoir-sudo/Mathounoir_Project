# Mijoté 🍲

Application web mobile **installable** (PWA) de cuisine anti-gaspillage :
notez ce que vous avez au frigo, Mijoté vous montre ce qui doit être consommé
en priorité et les recettes qui permettent de l'utiliser.

- **Sans compte, sans serveur, sans clé API** : tout est stocké sur le téléphone (IndexedDB).
- **Fonctionne hors connexion** après la première visite.
- Sauvegarde / restauration manuelle en fichier JSON (écran Réglages).

## Utiliser l'application

Une fois déployée : https://mathounoir-sudo.github.io/Mathounoir_Project/

- **Android (Chrome)** : menu ⋮ → « Installer l'application ».
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

## Commandes utiles

Prérequis : Node.js 22 ou plus.

| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances (une fois) |
| `npm run dev` | Lance l'app en local avec rechargement automatique |
| `npm test` | Tests de la logique (rapides) |
| `npm run e2e` | Tests dans un vrai navigateur (Playwright) |
| `npm run check` | Tout vérifier : lint, types, tests, build |
| `npm run build` | Produit la version à publier dans `dist/` |
| `npm run icons` | Régénère les icônes PNG (nécessite Python + Pillow) |

## Organisation du code

```
src/
├─ app/          démarrage, navigation, barre d'onglets, message de mise à jour
├─ features/     un dossier par écran : pantry (garde-manger), recipes, settings
├─ data/         base locale (db.ts), catalogue d'ingrédients, recettes intégrées
├─ domain/       logique pure, sans React, entièrement testée
│                (dates limites, reconnaissance d'ingrédients, suggestions, sauvegarde)
└─ ui/           petits composants réutilisables
e2e/             tests de bout en bout
```

### Ajouter une recette

Éditer `src/data/recipes.ts`. Chaque ingrédient fait référence à un `id` de
`src/data/ingredients.ts` (un test vérifie que tous les ids existent).

### Modifier la structure des données

Voir le commentaire en tête de `src/data/db.ts` : ne jamais modifier une version
existante de la base, toujours en ajouter une nouvelle avec une migration.

## Déploiement

Le workflow `.github/workflows/deploy.yml` publie automatiquement sur GitHub Pages
à chaque mise à jour de la branche `main`.

Activation (une seule fois) : sur GitHub, **Settings → Pages → Source : « GitHub Actions »**.

⚠️ Les données des utilisateurs sont liées à l'adresse exacte de l'app.
Changer d'adresse (autre domaine, renommage du dépôt) leur ferait perdre leur
garde-manger : il faudrait alors passer par l'export / import.
