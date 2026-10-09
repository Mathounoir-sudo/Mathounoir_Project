# Mijoté — notes pour l'assistant

PWA React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Zod, 100 % locale (Dexie/IndexedDB), en français.
Cahier des charges par phases : phases 1, 2 et 3 terminées (voir README). Ne pas commencer une phase avant que la précédente passe ses tests.
L'utilisateur débute : expliquer simplement, en français, et travailler par petites étapes testées.

## Vérifications avant chaque commit
- `npm run check` (lint, types, tests unitaires, build)
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e` dans l'environnement cloud
  (Playwright est épinglé en 1.56.1 pour réutiliser ce Chromium préinstallé).

## Règles
- Logique métier dans `src/domain/` (pure, testée avec Vitest) ; accès aux données dans `src/services/` ; écrans dans `src/features/`.
- Sécurité alimentaire : ne jamais inventer de date, quantité ou valeur nutritionnelle ; DLC ≠ DDM ; ne jamais supposer un ingrédient présent (basiques confirmés par l'utilisateur).
- Ne jamais afficher une fonction IA comme active si elle n'est pas configurée ; pas de bouton sans effet.
- Toute recette (démo ou future IA) passe par `validateRecipes` / `recipeSchema` avant affichage.
- Moteur de recettes : `src/domain/recipe-engine.ts`, déterministe. Pas de correspondance floue (seulement lien confirmé,
  nom/synonyme exact, ou « probable » = à confirmer) ; pas de conversion masse ↔ volume ; quantité inconnue ≠ suffisante ;
  une recette moins faisable ne passe jamais devant une plus faisable.
- Restes : table `leftovers` séparée de l'inventaire, reliés seulement à un ingrédient de catégorie `prepared`
  (cru ≠ cuit). Aucune durée de conservation calculée ; date de préparation ≠ date limite.
- Préparations : `recordPreparation` = une transaction (pantry + leftovers + preparations), identifiant unique
  anti-doublon, stock relu dans la transaction ; jamais de stock négatif ni de déduction sur quantité inconnue.
- Erreurs de stockage : passer par `withStorage` (messages en français) et `useToast().run`.
- Schéma Dexie : ajouter une nouvelle `version(N+1)` avec migration, ne jamais modifier une version existante.
- Les `id` d'ingrédients et de recettes sont stables : ne pas les renommer.
- Navigation par HashRouter (`/#/...`) pour GitHub Pages ; ne pas changer sans plan de redirection.
- TypeScript reste en 6.0.x tant que typescript-eslint ne supporte pas TS 7.
- Pas de dépendance à un service payant ni à un compte utilisateur sans accord explicite.
