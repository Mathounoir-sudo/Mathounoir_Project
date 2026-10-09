import { defineConfig, devices } from '@playwright/test'

// Dans l'environnement cloud, Chromium est déjà installé : on le réutilise.
const executablePath = process.env.PW_CHROMIUM_PATH

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
