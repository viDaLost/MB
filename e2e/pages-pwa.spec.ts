import { expect, test } from '@playwright/test';

test.describe('GitHub Pages production PWA', () => {
  test.skip(!process.env.PWA_E2E, 'Requires a production preview with an active service worker.');

  test('loads both games offline from a repository subpath', async ({ context, page }) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('./');
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();

    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Две истории/ })).toBeVisible();
    await page.getByRole('button', { name: 'Войти в город' }).click();
    await expect(page.getByRole('button', { name: 'Запечатать роли' })).toBeVisible();

    await page.evaluate(() => {
      window.location.hash = '#/bunker';
    });
    await expect(page.getByRole('button', { name: 'Сгенерировать убежище' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    expect(errors).toEqual([]);
  });
});
