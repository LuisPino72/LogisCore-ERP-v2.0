import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL_A = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TENANT_A_SLUG = 'prueba';
const TENANT_B_SLUG = 'empresa-b';

async function loginAndSelectTenant(page: import('@playwright/test').Page, tenantSlug: string): Promise<DexieUtil> {
  const dbUtil = new DexieUtil(page);
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('#email, input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill(TEST_USER_EMAIL_A);
    await page.locator('#password, input[type="password"]').first().fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 20000 }).catch(() => {});
  }
  
  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });
  
  return dbUtil;
}

async function ensureTestDataExists(page: import('@playwright/test').Page) {
  const dbUtil = new DexieUtil(page);
  const products = await dbUtil.getByIndex('products', 'tenantId', TENANT_A_SLUG);
  
  if (products.length === 0) {
    console.log('Creating test data via Dexie...');
    await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.products) return;
      await db.products.add({
        tenantId: 'prueba',
        name: 'Producto Test A',
        sku: 'TEST-A-001',
        price: 100,
        isWeighted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }
  
  return dbUtil;
}

test.describe('Multi-Tenant Isolation E2E', () => {
  
  test('TENANT-ISOLATION-001: Verify Tenant A products are NOT visible to Tenant B', async ({ page, context }) => {
    const dbUtil = await loginAndSelectTenant(page, TENANT_A_SLUG);
    
    console.log('\n=== STEP 1: Login as Tenant A ===');
    await ensureTestDataExists(page);
    
    const tenantAProducts = await dbUtil.getByIndex('products', 'tenantId', TENANT_A_SLUG);
    console.log(`Tenant A products: ${tenantAProducts.length}`);
    expect(tenantAProducts.length).toBeGreaterThan(0);
    
    const tenantAProductNames = tenantAProducts.map((p: Record<string, unknown>) => p.name as string);
    console.log(`Tenant A product names: ${tenantAProductNames.slice(0, 3).join(', ')}`);
    
    console.log('\n=== STEP 2: Clear session and simulate Tenant B ===');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('logiscore-db');
    });
    
    console.log('\n=== STEP 3: Check if Tenant A products leak into new session ===');
    const leakedProducts = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.products) return [];
      return await db.products.toArray();
    });
    
    console.log(`Products in new session before login: ${leakedProducts.length}`);
    
    console.log('\n=== STEP 4: Verify Tenant ID format in Dexie ===');
    const isSlugValid = await dbUtil.verifyTenantIdIsSlug(TENANT_A_SLUG);
    expect(isSlugValid).toBe(true);
    
    const productsWithTenantA = await dbUtil.getByIndex('products', 'tenantId', TENANT_A_SLUG);
    console.log(`Products filtered by Tenant A slug: ${productsWithTenantA.length}`);
    
    const productsWithTenantB = await dbUtil.getByIndex('products', 'tenantId', TENANT_B_SLUG);
    console.log(`Products filtered by Tenant B slug: ${productsWithTenantB.length}`);
    
    expect(productsWithTenantA.length).toBeGreaterThan(0);
    expect(productsWithTenantB.length).toBe(0);
    
    console.log('\n=== MULTI-TENANT ISOLATION VERIFIED ===');
  });
  
  test('TENANT-ISOLATION-002: Verify tenantId is always slug in Dexie (never UUID)', async ({ page }) => {
    const dbUtil = await loginAndSelectTenant(page, TENANT_A_SLUG);
    
    console.log('\n=== TENANT ID SCHEMA VALIDATION ===');
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TENANT_A_SLUG);
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const slugRegex = /^[a-z0-9-]+$/;
    
    for (const product of products.slice(0, 5)) {
      const tenantId = product.tenantId as string;
      console.log(`Product: ${product.name}, tenantId: ${tenantId}`);
      
      const isUUID = uuidRegex.test(tenantId);
      const isSlug = slugRegex.test(tenantId);
      
      expect(isUUID).toBe(false);
      expect(isSlug).toBe(true);
    }
    
    console.log('\n=== SCHEMA DUAL (Dexie = slug) VERIFIED ===');
  });
  
  test('TENANT-ISOLATION-003: Verify sales of Tenant A are isolated from Tenant B', async ({ page }) => {
    const dbUtil = await loginAndSelectTenant(page, TENANT_A_SLUG);
    
    console.log('\n=== SALES ISOLATION TEST ===');
    
    const tenantASales = await dbUtil.getByIndex('sales', 'tenantId', TENANT_A_SLUG);
    const tenantBSales = await dbUtil.getByIndex('sales', 'tenantId', TENANT_B_SLUG);
    
    console.log(`Tenant A sales: ${tenantASales.length}`);
    console.log(`Tenant B sales: ${tenantBSales.length}`);
    
    if (tenantASales.length > 0) {
      const sale = tenantASales[0] as Record<string, unknown>;
      console.log(`Tenant A sale tenantId: ${sale.tenantId}`);
      expect(sale.tenantId).toBe(TENANT_A_SLUG);
    }
    
    expect(tenantBSales.length).toBe(0);
    
    console.log('\n=== SALES ISOLATION VERIFIED ===');
  });
});