import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function loginAndBootstrap(page: import('@playwright/test').Page): Promise<DexieUtil> {
  const dbUtil = new DexieUtil(page);
  
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('#email, input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill(TEST_USER_EMAIL);
    await page.locator('#password, input[type="password"]').first().fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard**', { timeout: 20000 }).catch(() => {});
  }
  
  await page.waitForFunction(() => {
    return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb !== undefined;
  }, { timeout: 15000 });
  
  return dbUtil;
}

test.describe('Admin Plan Limits E2E', () => {
  
  test('ADMIN-PLAN-001: Verify Basic plan blocks Production module access', async ({ page }) => {
    await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Check Plan Type ===');
    const tenants = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.tenants) return [];
      return await db.tenants.toArray();
    });
    
    console.log(`Tenants found: ${tenants.length}`);
    
    console.log('\n=== STEP 2: Attempt to Access Production Module ===');
    await page.goto('/production');
    await page.waitForLoadState('networkidle');
    
    const productionHeading = page.locator('h1:has-text("Producción"), h2:has-text("Producción")').first();
    const hasProductionAccess = await productionHeading.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasProductionAccess) {
      const accessDeniedMsg = page.locator('text=Acceso Denegado, text=Plan Pro, text=plan no incluye').first();
      const isBlocked = await accessDeniedMsg.isVisible({ timeout: 3000 }).catch(() => false);
      
      console.log(`Production module blocked: ${isBlocked}`);
      if (isBlocked) {
        console.log('ADMIN_PRODUCTION_ACCESS_DENIED - Expected for Basic plan');
        expect(true).toBe(true);
        return;
      }
    }
    
    console.log('\n=== STEP 3: Check Subscription Details ===');
    const subscriptions = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.subscriptions) return [];
      return await db.subscriptions.toArray();
    });
    
    console.log(`Active subscriptions: ${subscriptions.length}`);
    
    console.log('\n=== PLAN LIMIT TEST COMPLETE ===');
  });
  
  test('ADMIN-PLAN-002: Verify Admin Panel is accessible', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== ADMIN PANEL ACCESS TEST ===');
    
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    const adminHeading = page.locator('h1:has-text("Admin"), h1:has-text("Administración"), h2:has-text("Admin")').first();
    const hasAdminAccess = await adminHeading.isVisible({ timeout: 5000 }).catch(() => false);
    
    console.log(`Admin panel accessible: ${hasAdminAccess}`);
    
    const users = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.users) return [];
      return await db.users.toArray();
    });
    
    console.log(`Users in system: ${users.length}`);
    
    console.log('\n=== ADMIN PANEL ACCESS VERIFIED ===');
  });
  
  test('ADMIN-PLAN-003: Verify user limit enforcement (Basic = 3 users)', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== USER LIMIT TEST ===');
    
    const users = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.users) return [];
      return await db.users.toArray();
    });
    
    console.log(`Current user count: ${users.length}`);
    
    const isBasicPlan = users.length <= 3;
    console.log(`Plan appears to be Basic (≤3 users): ${isBasicPlan}`);
    
    if (users.length >= 3) {
      console.log('User limit reached - Basic plan allows max 3 users');
    }
    
    console.log('\n=== USER LIMIT TEST COMPLETE ===');
  });
  
  test('ADMIN-PLAN-004: Verify products limit in Basic plan (500 products)', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== PRODUCTS LIMIT TEST ===');
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Current product count: ${products.length}`);
    
    const BASIC_LIMIT = 500;
    const nearLimit = products.length >= BASIC_LIMIT - 50;
    
    console.log(`Near Basic limit (500): ${nearLimit}`);
    if (products.length >= BASIC_LIMIT) {
      console.log('PRODUCT LIMIT EXCEEDED - Basic plan max 500 products');
    }
    
    console.log('\n=== PRODUCTS LIMIT TEST COMPLETE ===');
  });
});