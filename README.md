# Mijoté 🍲

> Nom provisoire, non vérifié sur le plan des marques.

Application web mobile **installable** (PWA) de cuisine anti-gaspillage pour les personnes seules ou en couple :
**« Cuisinez quelque chose de bon avec ce que vous avez déjà. »**

Inventaire → Priorités → Recette faisable → Cuisiner → Restes → Recommencer.

## État actuel : phase 3 (restes et suivi anti-gaspillage)

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
| Restes : écran « Mes restes » (onglet de l'Inventaire), ajout, quantité, mangé / jeté, historique | ✅ phase 3 |
| Parcours « Je cuisine cette recette » : portions, quantités réellement utilisées, restes conservés | ✅ phase 3 |
| Déduction de l'inventaire confirmée, atomique et sans double déduction | ✅ phase 3 |
| Ingrédients cuisinés distincts des crus (riz cuit ≠ riz) ; recettes qui utilisent les restes en avant | ✅ phase 3 |
| **Reconnaissance photo** | ⏳ Non configurée : l'écran l'explique et propose la saisie manuelle |
| **Génération de recettes par IA** | ⏳ Non configurée : 12 recettes de démonstration fixes |
| Mode cuisine (étapes à cocher, minuteurs), notifications | ⏳ À venir |
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

## Restes et préparations (phase 3)

**Modèle** (`src/domain/types.ts`, `src/domain/leftovers.ts`)
- Un **reste** (`Leftover`) est un aliment ou un plat déjà cuisiné, rangé dans sa propre table (`leftovers`),
  séparée de l'inventaire des produits bruts. Il a : un nom, une quantité et une unité (souvent des portions),
  une **date de préparation** (qui n'est jamais une date limite), une **date limite facultative fixée par
  l'utilisateur** — « de sécurité » (traitée comme une DLC) ou « indicative » (traitée comme une DDM) —,
  un statut (disponible, consommé, jeté), une note, et la recette d'origine le cas échéant.
- Un reste n'est relié qu'à un ingrédient **cuisiné** du catalogue (catégorie « Plats et restes cuisinés » :
  riz cuit, pâtes cuites, légumes cuits, poulet cuit, soupe, purée), ou à rien (plat non réutilisable).
  Un reste de riz n'est donc jamais confondu avec du riz cru, et une soupe jamais avec des légumes crus.
- Mijoté ne calcule **aucune durée de conservation** : sans date limite saisie, il l'indique.
- Une **préparation** (`Preparation`, table `preparations`) garde l'historique : recette, portions préparées et
  mangées, quantités retirées de chaque produit, reste créé.

**Parcours « Je cuisine cette recette »** (`/recettes/:id/preparer/:idPréparation`)
1. Portions préparées.
2. Ingrédients nécessaires (avec leur disponibilité).
3. Quantités réellement utilisées, produit par produit : « Déduire » (quantité modifiable, dans l'unité du
   produit), « Il n'en reste plus », ou « Ne rien déduire ». Les quantités proposées ne sont qu'une
   suggestion ; rien n'est retiré avant l'enregistrement. Impossible de déduire plus que le stock connu ;
   une quantité inconnue ne peut pas être « réduite » (choix explicite obligatoire).
4. Portions mangées, et reste à garder : quantité saisie par l'utilisateur (Mijoté ne transforme jamais
   « 200 g de riz cru » en « 200 g de riz cuit »).

**Cohérence et doublons** (`src/services/preparations.ts`)
- Tout est écrit dans **une seule transaction IndexedDB** (inventaire + restes + historique) : tout ou rien.
- Le stock est **relu dans la transaction** : une quantité modifiée entre-temps est revérifiée.
- L'identifiant de la préparation est créé à l'ouverture du formulaire et placé dans l'adresse. S'il existe déjà
  (double clic, nouvelle tentative, rechargement), rien n'est déduit une seconde fois.
- Un reste entièrement utilisé par une recette passe à « consommé ».

**Moteur de recettes** : les restes disponibles sont ajoutés au stock comme ingrédients cuisinés. Critère de
classement n°2 (après la faisabilité) : nombre de restes utilisés ; les cartes affichent « Utilise tes restes ».
Le mode strict reste inchangé : un reste insuffisant n'est jamais déclaré suffisant.

**Migration** : la base passe en **version 3**. Les tables `leftovers` et `preparations` sont ajoutées, et les
anciens produits d'inventaire marqués « Reste cuisiné » y sont **déplacés** (dans la même transaction de mise à
niveau : tout ou rien), reliés à l'équivalent cuisiné (riz → riz cuit). Un ancien enregistrement incomplet reste
dans l'inventaire au lieu de bloquer la migration. Les sauvegardes passent en v3 (restes et historique inclus) ;
les fichiers v1 et v2 restent lisibles.

### Limites connues

- Seuls six ingrédients cuisinés sont au catalogue (riz, pâtes, légumes, poulet, soupe, purée) : un autre
  plat est suivi comme reste, mais n'est proposé dans aucune recette.
- Les restes ne sont pas rangés par lieu (réfrigérateur, congélateur) et ne déclenchent pas de notification.
- Annuler une préparation n'est pas possible automatiquement : il faut corriger les quantités à la main.
- Un basique coché (sel, huile…) n'est pas déduit, faute de quantité suivie.
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
