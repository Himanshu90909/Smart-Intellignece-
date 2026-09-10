import { expect, test } from '@playwright/test';

/**
 * FLOW 1 — Catalog → search "running shoes" → apply price filter → verify results.
 */
test('FLOW 1: search + price filter', async ({ page }) => {
  await page.goto('/catalog');

  // search from the navbar
  await page.getByRole('combobox', { name: 'Search products' }).fill('running shoes');
  await page.getByRole('combobox', { name: 'Search products' }).press('Enter');
  await expect(page).toHaveURL(/\/search\?q=running(%20|\+)shoes/);

  // URL carries the query (shareable state); grid appears after skeleton settle
  const grid = page.locator('.pgrid article');
  await expect(grid.first()).toBeVisible({ timeout: 8000 });

  // apply a max-price filter via the sidebar
  await page.getByLabel('Maximum price in rupees').fill('2000');
  await expect(page).toHaveURL(/maxPrice=2000/, { timeout: 5000 });
  await expect(grid.first()).toBeVisible({ timeout: 8000 }); // re-render settle

  // every visible card must respect the price cap
  const cards = await grid.all();
  for (const card of cards) {
    const priceText = await card.locator('.pp-main').first().textContent();
    const price = Number((priceText || '0').replace(/[₹,]/g, ''));
    expect(price).toBeLessThanOrEqual(2000);
  }
});

/**
 * FLOW 2 — Open product → add to cart → open cart → verify product.
 */
test('FLOW 2: product → cart', async ({ page }) => {
  await page.goto('/catalog');
  await page.locator('.pgrid article a.pc-img').first().click();
  await expect(page).toHaveURL(/\/product\/\d+/);

  const name = await page.locator('.pd-info h1').textContent();
  await page.getByRole('button', { name: /^Add to Cart$/ }).click();

  // cart drawer opens automatically
  await expect(page.locator('.drawer, [role="dialog"], .cart-drawer').first()).toBeVisible();

  // the product is inside
  const cartText = await page.locator('body').textContent();
  expect(cartText).toContain((name || '').split(' ').slice(0, 2).join(' '));
});

/**
 * FLOW 3 — Select two products → compare → verify comparison table.
 */
test('FLOW 3: comparison table', async ({ page }) => {
  await page.goto('/catalog');
  await page.locator('.pgrid article').first().getByRole('button', { name: /comparison/i }).click();
  await page.locator('.pgrid article').nth(1).getByRole('button', { name: /comparison/i }).click();

  // open comparison via the compare bar
  await page.getByRole('link', { name: /compare/i }).first().click();
  await expect(page).toHaveURL(/\/compare/);

  await expect(page.locator('.cmp-table')).toBeVisible();
  await expect(page.getByRole('heading', { name: /AI Verdict/ })).toBeVisible();
});

/**
 * FLOW 4 — AI natural-language search: "white shoes under ₹3000"
 * → verify interpreted filters → verify results respect the price cap.
 */
test('FLOW 4: NL search interpretation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Search products' }).fill('white shoes under ₹3000');
  await page.getByRole('combobox', { name: 'Search products' }).press('Enter');
  await expect(page).toHaveURL(/\/search/);

  // the interpretation box shows parsed constraints
  const box = page.getByTestId('nl-interpretation');
  await expect(box).toBeVisible();
  await expect(box).toContainText('white');
  await expect(box).toContainText('3,000');

  // results respect the parsed max price
  const cards = await page.locator('.pgrid article').all();
  if (cards.length) {
    for (const card of cards) {
      const priceText = await card.locator('.pp-main').first().textContent();
      const price = Number((priceText || '0').replace(/[₹,]/g, ''));
      expect(price).toBeLessThanOrEqual(3000);
    }
  }
});

/**
 * FLOW 5 — Mobile catalog → open filter drawer → apply a filter → close drawer.
 */
test('FLOW 5: mobile filter drawer', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/catalog');

  const openFilters = page.getByRole('button', { name: /open filters/i });
  await expect(openFilters).toBeVisible();
  await openFilters.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const rating = page.getByRole('dialog').locator('input[name="rating"]').first();
  await rating.click({ noWaitAfter: true });
  await expect(page).toHaveURL(/rating=/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

/**
 * FLOW 6 — Live API failure → user-safe error state → retry remains available.
 */
test('FLOW 6: live API failure recovery', async ({ page }) => {
  await page.route('**/api/amazonLive**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Live data is not configured for this deployment.' }),
    });
  });
  await page.goto('/live');
  await page.getByRole('textbox', { name: 'Amazon search query' }).fill('wireless headphones');
  await page.getByRole('button', { name: /search amazon/i }).click();

  await expect(page.getByRole('alert')).toContainText('Live data is not configured');
  await expect(page.getByRole('alert').getByRole('button', { name: /retry/i })).toBeVisible();
});
