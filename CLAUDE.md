# Mijoté — notes pour l'assistant

PWA React 19 + TypeScript + Vite 8, 100 % locale (Dexie/IndexedDB), en français.
L'utilisateur débute : expliquer simplement, en français, et travailler par petites étapes testées.

## Vérifications avant chaque commit
- `npm run check` (lint, types, tests unitaires, build)
- `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run e2e` dans l'environnement cloud
  (Playwright est épinglé en 1.56.1 pour réutiliser ce Chromium préinstallé).

## Règles
- Logique métier dans `src/domain/` (pure, testée avec Vitest) ; les écrans dans `src/features/`.
- Schéma Dexie : ajouter une nouvelle `version(N+1)` avec migration, ne jamais modifier une version existante.
- Les `id` d'ingrédients et de recettes sont stables : ne pas les renommer.
- Navigation par HashRouter (`/#/...`) pour GitHub Pages ; ne pas changer sans plan de redirection.
- TypeScript reste en 6.0.x tant que typescript-eslint ne supporte pas TS 7.
- Pas de dépendance à un service payant ni à un compte utilisateur sans accord explicite.
