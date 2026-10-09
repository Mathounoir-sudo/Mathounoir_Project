import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './Layout'
import { PantryPage } from '../features/pantry/PantryPage'
import { RecipesPage } from '../features/recipes/RecipesPage'
import { RecipeDetailPage } from '../features/recipes/RecipeDetailPage'
import { SettingsPage } from '../features/settings/SettingsPage'

// HashRouter (adresses du type /#/recettes) : fonctionne sur n'importe quel hébergement statique,
// y compris GitHub Pages, sans configuration serveur.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PantryPage />} />
          <Route path="recettes" element={<RecipesPage />} />
          <Route path="recettes/:id" element={<RecipeDetailPage />} />
          <Route path="reglages" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
