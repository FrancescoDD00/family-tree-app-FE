import { test, expect } from '@playwright/test';

test.describe('About page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/about');
    });

    test('mostra il titolo della pagina', async ({ page }) => {
        await expect(page.locator('.hero h1')).toContainText('Informazioni');
    });

    test('mostra le tre sezioni principali', async ({ page }) => {
        const sections = page.locator('.about-section');
        await expect(sections).toHaveCount(3);
    });

    test('credits visibile a fine pagina', async ({ page }) => {
        await expect(page.locator('.credits')).toBeVisible();
    });

    test('switch lingua traduce i contenuti', async ({ page }) => {
        await page.locator('.lang-switcher').click();
        await expect(page.locator('.hero h1')).toContainText('About');
    });
});