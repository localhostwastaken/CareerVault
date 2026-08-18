import { defineConfig, devices } from '@playwright/test'
import {
  ADMIN_DATABASE_URL,
  API_BASE,
  API_ENV,
  CLIENT_BASE,
  CLIENT_PORT,
  E2E_DATABASE_NAME,
  REPO_ROOT,
} from './env'

export default defineConfig({
  testDir: './specs',
  // Each spec provisions its own organisation and drives it through a lifecycle, so the
  // tests within a file depend on each other by design; files remain independent.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: CLIENT_BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      // Prepare the database, apply migrations, then boot. Chained so ordering is
      // guaranteed — Playwright starts web servers before globalSetup, so database setup
      // cannot live there. The demo seed is deliberately NOT run: every test creates the
      // data it needs, which keeps them readable and independent of fixture drift.
      command:
        'node e2e/scripts/prepare-db.mjs && cd server && npx prisma migrate deploy && npm run start',
      cwd: REPO_ROOT,
      url: `${API_BASE}/health`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...API_ENV,
        E2E_ADMIN_DATABASE_URL: ADMIN_DATABASE_URL,
        E2E_DATABASE_NAME,
      },
    },
    {
      // VITE_APP_ENV=development makes config/APIEndpoints.ts read VITE_API_URL, which is
      // how the client is pointed at the test API without touching any client code.
      command: `npm run dev -- --port ${CLIENT_PORT} --strictPort`,
      cwd: `${REPO_ROOT}/client`,
      url: CLIENT_BASE,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_APP_ENV: 'development',
        VITE_API_URL: API_BASE,
      },
    },
  ],
})
