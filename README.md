# Mijoté 🍲

> Nom provisoire, non vérifié sur le plan des marques.

Application web mobile **installable** (PWA) de cuisine anti-gaspillage pour les personnes seules ou en couple :
**« Cuisinez quelque chose de bon avec ce que vous avez déjà. »**

Inventaire → Priorités → Recette faisable → Cuisiner → Restes → Recommencer.

## État actuel : phase 2 (moteur de recettes)

| Fonctionnalité | État |
|---|---|
| Accueil : ingrédients suivis, priorités, actions principales, idées de recettes | ✅ |
| Inventaire : ajouter, rechercher, modifier, supprimer, + / −, vue par catégorie ou par priorité | ✅ |
| État, rangement, dates d'achat / d'ouverture, DLC / DDM / « type inconnu » jamais devinées | ✅ |
| Ingrédient correspondant (lien vers le catalogue) choisi ou confirmé dans le formulaire | ✅ phase 2 |
| Moteur de recettes déterministe : disponible / insuffisant / manquant / à confirmer | ✅ phase 2 |
| Conversions d'unités fiables, entrées en double additionnées | ✅ phase 2 |
| Remplacements structurés (ex. crème → lait + œuf) | ✅ phase 2 |
| Au plus 3 recommandations variées, avec explication | ✅ phase 2 |
| Mode « Uniquement avec ce que j'ai » avec exclusions expliquées | ✅ phase 2 |
| Nombre de portions (1 à 8) mémorisé, quantités et faisabilité recalculées | ✅ phase 2 |
| Détail recette : quantités, matériel, étapes avec feu / four, remplacements, intérêt anti-gaspi | ✅ phase 2 |
| Recettes enregistrées (favoris), sauvegarde / restauration JSON, démo retirable | ✅ |
| Hors connexion, installable, mise à jour signalée | ✅ |
| **Reconnaissance photo** | ⏳ Non configurée : l'écran l'explique et propose la saisie manuelle |
| **Génération de recettes par IA** | ⏳ Non configurée : 12 recettes de démonstration fixes |
| Mode cuisine (étapes à cocher, minuteurs), suivi des restes et historique des mouvements | ⏳ À venir |
| Exclusions / allergies | ⏳ À venir — aucune recette n'est présentée comme sans allergène |
| Compte, synchronisation (Supabase) | ⏳ Phase 4 |

Aucune clé d'API, aucun compte, aucun serveur : tout est stocké sur l'appareil (IndexedDB).

## Le moteur de recettes

Code : `src/domain/recipe-engine.ts` (logique pure, sans React), testé dans `recipe-engine.test.ts`.

**Correspondance des ingrédients** (`src/domain/ingredients.ts`)
- Lien **confirmé** : choisi dans le formulaire (« Ingrédient correspondant »), ou fixé dans les données de démo.
- Lien **exact** : le nom correspond exactement à un nom ou à un synonyme explicite du catalogue.
- Lien **probable** : le nom *commence* par un ingrédient connu (« Tomates cerises » → tomate). Il n'est jamais
  compté comme disponible : la recette est « à confirmer ».
- Un nom qui *contient* seulement un mot connu n'est pas relié (« Jus de citron », « Bouillon de poulet » ≠ poulet).

**Quantités** (`src/domain/units.ts`)
- Conversions uniquement à l'intérieur d'une même famille : g ↔ kg ; ml ↔ cl ↔ l ↔ c. à s. (15 ml) ↔ c. à c. (5 ml).
- Jamais de conversion masse ↔ volume, ni entre unités de comptage (unité, tranche, boîte…).
- Quantité inconnue ou unités non comparables → « à confirmer », jamais « suffisant ».
- Entrées en double : additionnées, chacune une seule fois.
- Portions : quantités recalculées depuis les portions de base, arrondies pour la cuisine (au demi pour les
  unités et cuillères, à 5 ou 10 g près…). Une recette « non ajustable » (gâteau en moule) garde ses quantités.

**Basiques et sécurité**
- Sel, poivre, huile, eau ne comptent que si l'utilisateur les a cochés (« Mes basiques »). Un basique coché est
  considéré comme disponible sans suivi de quantité ; une entrée d'inventaire avec quantité est prioritaire.
- Produit à DLC dépassée, à date de type inconnu dépassée, ou épuisé : jamais utilisé (la raison est affichée).
- DDM dépassée : utilisable, mise en avant, avec un rappel de vérification.

**Faisabilité d'une recette** (ingrédients obligatoires seulement)
- **Faisable** : tout est disponible en quantité suffisante (ou remplacé par un remplacement prévu).
- **À confirmer** : rien ne manque à coup sûr, mais une quantité ou une correspondance est incertaine.
- **Courses nécessaires** : au moins un ingrédient manque ou est insuffisant (la quantité manquante est indiquée).

**Classement** (critère suivant seulement en cas d'égalité)
1. Faisabilité : faisable > à confirmer > courses nécessaires — jamais l'inverse.
2. Produits à écouler utilisés : priorité haute = 2 points, moyenne = 1 (dates, « à utiliser en priorité »,
   restes cuisinés, produits entamés — voir `priority.ts`).
3. Moins d'ingrédients à acheter, puis moins d'ingrédients à confirmer.
4. Temps total le plus court.
5. Identifiant de la recette (résultat identique pour des entrées identiques).

Les 3 recommandations évitent deux plats de la même famille *à faisabilité égale* ; la variété ne fait jamais
passer une recette moins faisable devant une autre. En mode strict, les recettes qui demandent des courses sont
écartées et listées avec leur raison.

**Recettes** : `src/data/demo-recipes.ts`, validées par `recipeSchema` avant affichage. Une future source (IA par
exemple) devra passer par la même validation (`validateRecipes`) : l'interface ne dépend d'aucun fournisseur.

### Limites connues

- Le catalogue ne distingue pas un ingrédient cru d'un ingrédient cuit : des pâtes sèches comptent pour
  « pâtes déjà cuites ». La note de la recette l'indique, mais la quantité n'est pas convertie.
- Un basique coché n'a pas de quantité suivie.
- Les produits enregistrés avant la phase 2 gardent un lien recalculé depuis leur nom tant qu'ils ne sont pas
  ré-enregistrés (ouvrir le produit et l'enregistrer confirme son ingrédient correspondant).

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
│                  priorités et sécurité (priority.ts), moteur de recettes (recipe-engine.ts),
│                  correspondance (ingredients.ts), unités (units.ts), quantités, dates,
│                  validation Zod (schemas.ts), sauvegarde, migrations
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
  « Faisable » n'est affiché que si chaque ingrédient obligatoire est disponible en quantité suffisante.
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
