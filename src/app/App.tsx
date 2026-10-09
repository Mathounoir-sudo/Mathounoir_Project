import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { ToastProvider } from '../components/Toast'
import { Layout } from './Layout'
import { StorageGate } from './StorageGate'
import { HomePage } from '../features/home/HomePage'
import { InventoryPage } from '../features/inventory/InventoryPage'
import { IngredientFormPage } from '../features/inventory/IngredientFormPage'
import { RecipesPage } from '../features/recipes/RecipesPage'
import { RecipeDetailPage } from '../features/recipes/RecipeDetailPage'
import { PreparePage, PrepareRedirect } from '../features/recipes/PreparePage'
import { LeftoversPage } from '../features/leftovers/LeftoversPage'
import { LeftoverFormPage } from '../features/leftovers/LeftoverFormPage'
import { ScanPage } from '../features/photo-recognition/ScanPage'
import { SettingsPage } from '../features/settings/SettingsPage'

// HashRouter (adresses du type /#/recettes) : fonctionne sur n'importe quel hébergement statique,
// y compris GitHub Pages, sans configuration serveur.
export function App() {
  return (
    <ErrorBoundary>
      <StorageGate>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="inventaire" element={<InventoryPage />} />
                <Route path="inventaire/nouveau" element={<IngredientFormPage />} />
                <Route path="inventaire/restes" element={<LeftoversPage />} />
                <Route path="inventaire/restes/nouveau" element={<LeftoverFormPage />} />
                <Route path="inventaire/restes/:id" element={<LeftoverFormPage />} />
                <Route path="inventaire/:id" element={<IngredientFormPage />} />
                <Route path="recettes" element={<RecipesPage />} />
                <Route path="recettes/:id" element={<RecipeDetailPage />} />
                <Route path="recettes/:id/preparer" element={<PrepareRedirect />} />
                <Route path="recettes/:id/preparer/:prepId" element={<PreparePage />} />
                <Route path="scanner" element={<ScanPage />} />
                <Route path="reglages" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ToastProvider>
      </StorageGate>
    </ErrorBoundary>
  )
}
