import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('home and settings fit a phone screen', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Две истории/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Войти в город' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('dialog', { name: 'Настройки приложения' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('Mafia protects a role on reveal and refresh', async ({ page }) => {
  await page.getByRole('button', { name: 'Войти в город' }).click();
  await page.getByRole('button', { name: 'Запечатать роли' }).click();
  const reveal = page.getByRole('button', { name: 'Удерживайте, чтобы открыть' });
  await expect(reveal).toBeVisible();
  await reveal.dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await expect(page.locator('.secret-card')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Удерживайте, чтобы открыть' })).toBeVisible();
  await expect(page.locator('.secret-card')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test('Bunker creates a coherent scenario and protects a dossier', async ({ page }) => {
  await page.getByRole('button', { name: 'Открыть гермодверь' }).click();
  await page.getByRole('button', { name: 'Сгенерировать убежище' }).click();
  await expect(page.getByText('Снаружи')).toBeVisible();
  await page.getByRole('button', { name: 'Зафиксировать' }).click();
  const reveal = page.getByRole('button', { name: 'Удерживайте, чтобы открыть' });
  await reveal.dispatchEvent('pointerdown');
  await page.waitForTimeout(700);
  await expect(page.locator('.dossier-card')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Удерживайте, чтобы открыть' })).toBeVisible();
  await expect(page.locator('.dossier-card')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
