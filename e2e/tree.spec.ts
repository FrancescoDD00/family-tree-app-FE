import { test, expect } from '@playwright/test';

test.describe('Tree page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/tree');
    });

    test('mostra l\'elemento canvas SVG', async ({ page }) => {
        const svg = page.locator('svg');
        await expect(svg).toBeVisible();
    });

    test('mostra il selettore di persona con opzione di default', async ({ page }) => {
        const select = page.locator('.selector select');
        await expect(select).toBeVisible();
        await expect(select.locator('option').first()).toContainText('Seleziona una persona');
    });

    test('header ancora visibile', async ({ page }) => {
        await expect(page.locator('.app-header')).toBeVisible();
    });
});