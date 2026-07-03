import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    timeout: 30000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:4200',
        headless: true,
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npx ng serve',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 60000,
    },
});