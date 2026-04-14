import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function getTenantSlugFromUrl(page: import('@playwright/test').Page, fallbackSlug: string): Promise<string> {
  return page.evaluate((fallback) => {
    const match = window.location.pathname.match(/\/tenant\/([^/]+)/);
    if (match) return match[1];
    
    const cardText = document.body.innerText;
    const slugMatch = cardText.match(/Slug:\s*([a-zA-Z0-9-]+)/);
    if (slugMatch) return slugMatch[1];
    
    return fallback;
  }, TEST_TENANT_SLUG);
}

test.beforeEach(async ({ page }) => {
  const dbUtil = new DexieUtil(page);
  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const isSlugValid = await dbUtil.verifyTenantIdIsSlug(tenantSlug);
  expect(isSlugValid).toBe(true);
});

test('Auth & Bootstrap - Dexie accessible after page load', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const db = await dbUtil.getDb();
  expect(db).toBeDefined();
  console.log('Dexie accessible via window.logiscoreDb');
});

test('Auth & Bootstrap - Login and verify bootstrap completes with real tenant', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('#email, input[type="email"]').first();
  const passwordInput = page.locator('#password, input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]');

  if (await emailInput.isVisible({ timeout: 5000 })) {
    await emailInput.fill(TEST_USER_EMAIL);
    await passwordInput.fill(TEST_USER_PASSWORD);
    await submitButton.click();
    await page.waitForTimeout(10000);
  }

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  await page.waitForTimeout(20000);

  const allTables = await page.evaluate(() => {
    const db = (window as unknown as { logiscoreDb?: Record<string, { toArray: () => Promise<unknown[]> }> }).logiscoreDb;
    if (!db) return {};
    const tables = ['categories', 'products', 'warehouses', 'product_presentations'];
    const result: Record<string, number> = {};
    return (async () => {
      for (const t of tables) {
        try {
          const count = await db[t]?.count?.();
          result[t] = count ?? 0;
        } catch {
          result[t] = 0;
        }
      }
      return result;
    })();
  });
  console.log('All tables counts:', JSON.stringify(allTables));

  const categoriesPrueba = await dbUtil.getByIndex('categories', 'tenantId', 'prueba');
  const categoriesGlobal = await dbUtil.getByIndex('categories', 'tenantId', '__global__');
  console.log(`Categories for 'prueba': ${categoriesPrueba.length}, for '__global__': ${categoriesGlobal.length}`);

  const tenantSlug = TEST_TENANT_SLUG;
  const categoriesInDb = await dbUtil.count('categories', tenantSlug);
  const warehousesInDb = await dbUtil.count('warehouses', tenantSlug);
  
  console.log(`Final: Categories=${categoriesInDb}, Warehouses=${warehousesInDb}`);
  
  expect(categoriesInDb).toBeGreaterThan(0);
  expect(warehousesInDb).toBeGreaterThan(0);
});

test('Dexie Query - Verify tenantId is slug (not UUID)', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const isSlugValid = await dbUtil.verifyTenantIdIsSlug(tenantSlug);
  expect(isSlugValid).toBe(true);
  
  const isInvalidSlug = await dbUtil.verifyTenantIdIsSlug('550e8400-e29b-41d4-a716-446655440000');
  expect(isInvalidSlug).toBe(false);
});

test('Dexie Query - Get records by index for real tenant', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const categories = await dbUtil.getByIndex('categories', 'tenantId', tenantSlug);
  console.log(`Found ${categories.length} categories for tenant ${tenantSlug}`);
  expect(Array.isArray(categories)).toBe(true);
});

test('Dexie Query - Get audit logs for real tenant', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const allLogs = await dbUtil.getAuditLogs(tenantSlug);
  console.log(`Found ${allLogs.length} audit logs`);
  expect(Array.isArray(allLogs)).toBe(true);
});

test('Dexie Query - Get sync errors for real tenant', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const errors = await dbUtil.getSyncErrors(tenantSlug);
  console.log(`Found ${errors.length} sync errors`);
  expect(Array.isArray(errors)).toBe(true);
});

test('Dexie Query - Clear tenant data for real tenant', async ({ page }) => {
  const dbUtil = new DexieUtil(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });

  const tenantSlug = await getTenantSlugFromUrl(page, TEST_TENANT_SLUG);
  const initialSales = await dbUtil.count('sales', tenantSlug);
  console.log(`Initial sales count: ${initialSales}`);
  
  await dbUtil.clearTenantData(tenantSlug);
  
  const afterClearSales = await dbUtil.count('sales', tenantSlug);
  expect(afterClearSales).toBe(0);
  console.log(`After clear sales count: ${afterClearSales}`);
});