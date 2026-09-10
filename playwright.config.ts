import { defineConfig } from '@playwright/test';

/**
 * E2E runs against a production build served by `vite preview`.
 * Run: npm run build && npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 20_000,
  },
  reporter: [['list']],
});
