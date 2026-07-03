import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('mostra il titolo principale e la descrizione', async ({ page }) => {
        await expect(page.locator('.hero h1')).toContainText('Benvenuto');
        await expect(page.locator('.hero p')).toBeVisible();
    });

    test('ha i bottoni CTA che portano alle pagine corrette', async ({ page }) => {
        const startBtn = page.locator('a.btn-primary');
        const aboutBtn = page.locator('a.btn-secondary');

        await expect(startBtn).toHaveText(/Inizia/);
        await expect(aboutBtn).toHaveText(/Scopri/);

        await startBtn.click();
        await expect(page).toHaveURL(/\/persons/);

        await page.goBack();
        await aboutBtn.click();
        await expect(page).toHaveURL(/\/about/);
    });

    test('mostra le feature cards', async ({ page }) => {
        const features = page.locator('.feature');
        await expect(features).toHaveCount(3);
    });

    test('header navigabile', async ({ page }) => {
        const navLinks = page.locator('nav a');
        await expect(navLinks).toHaveCount(3);

        await navLinks.nth(0).click();
        await expect(page).toHaveURL(/\/persons/);

        await navLinks.nth(1).click();
        await expect(page).toHaveURL(/\/about/);

        await navLinks.nth(2).click();
        await expect(page).toHaveURL(/\/tree/);
    });

    test('toggle lingua funziona', async ({ page }) => {
        const langSwitcher = page.locator('.lang-switcher');
        await expect(page.locator('.hero h1')).toContainText('Benvenuto');

        await langSwitcher.click();
        await expect(page.locator('.hero h1')).toContainText('Welcome');
    });
});