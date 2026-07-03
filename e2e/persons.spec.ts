import { test, expect } from '@playwright/test';

test.describe('Persons page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/persons');
    });

    test('mostra il form di aggiunta persona', async ({ page }) => {
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[formControlName="name"]')).toBeVisible();
        await expect(page.locator('input[formControlName="surname"]')).toBeVisible();
        await expect(page.locator('input[formControlName="birthDate"]')).toBeVisible();
        await expect(page.locator('select[formControlName="gender"]')).toBeVisible();
    });

    test('il filtro di ricerca è presente', async ({ page }) => {
        const searchInput = page.locator('.search-container input');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('type', 'text');
    });

    test('tabella con intestazioni corrette', async ({ page }) => {
        const headers = page.locator('table thead th');
        await expect(headers).toHaveCount(4);
        await expect(headers.nth(0)).toContainText('Nome Completo');
        await expect(headers.nth(1)).toContainText('Data di nascita');
    });

    test('switch lingua aggiorna le label del form', async ({ page }) => {
        await expect(page.locator('form label').first()).toContainText('Nome');

        await page.locator('.lang-switcher').click();

        await expect(page.locator('form label').first()).toContainText('Name');
    });
});