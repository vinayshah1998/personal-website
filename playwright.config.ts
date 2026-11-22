import { defineConfig, devices } from '@playwright/test';

const remote = process.env.E2E_BASE_URL;
const port = Number(process.env.E2E_PORT ?? 3217);
const mockPort = port + 1;
const local = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: remote ?? local,
  },
  webServer: remote
    ? undefined
    : [
        // The site reads Strava from this mock, so the stats page has data to chart.
        {
          command: `node tests/e2e/strava-mock-server.mjs`,
          url: `http://127.0.0.1:${mockPort}/health`,
          env: { STRAVA_MOCK_PORT: String(mockPort) },
          reuseExistingServer: false,
        },
        {
          command: `npm run build && npx next start -H 127.0.0.1 -p ${port}`,
          url: `${local}/`,
          env: {
            STRAVA_BASE_URL: `http://127.0.0.1:${mockPort}`,
            STRAVA_CLIENT_ID: 'mock',
            STRAVA_CLIENT_SECRET: 'mock',
            STRAVA_REFRESH_TOKEN: 'mock',
          },
          reuseExistingServer: false,
          timeout: 300_000,
          stdout: 'pipe',
        },
      ],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
