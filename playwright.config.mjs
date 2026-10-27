// GHOSH_TARGET=legacy (default): the released v1.1.0 in legacy/v1.1.0.   GHOSH_TARGET=dist: the v2 build in dist/.
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const target = process.env.GHOSH_TARGET || 'legacy';
const dir = target === 'dist' ? 'dist' : 'legacy/v1.1.0';
const port = 4173;

export default defineConfig({
  testDir: 'tests/browser',
  testMatch: '*.spec.mjs',
  timeout: 45_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${port}/`, viewport: { width: 412, height: 860 } },
  metadata: { target, dir, file: path.resolve(dir, 'Ghoshnaad.html') },
  webServer: { command: `node tests/browser/serve.mjs ${dir} ${port}`, url: `http://localhost:${port}/`, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 412, height: 860 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 412, height: 860 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 412, height: 860 } } },
  ],
});
