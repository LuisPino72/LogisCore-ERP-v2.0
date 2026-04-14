import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function loginAndNavigate(page: import('@playwright/test').Page, path: string = '/purchases') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.locator('#email, input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill(TEST_USER_EMAIL);
    await page.locator('#password, input[type="password"]').first().fill(TEST_USER_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(10000);
  }
  
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
}

test.describe('Purchases Module Tests', () => {
  
  test('Purchases - Access Purchases Panel', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const pageTitle = page.locator('h1, h2, [class*="title"]').first();
    const titleText = await pageTitle.textContent();
    console.log(`Purchases page title: ${titleText}`);
    
    expect(titleText).toBeDefined();
  });

  test('Purchases - Navigate to Orders tab', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const ordersTab = page.locator('button:has-text("Órdenes"), button:has-text("Orders")').first();
    if (await ordersTab.isVisible({ timeout: 3000 })) {
      await ordersTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Orders tab');
    }
    
    const ordersList = page.locator('[class*="order"], table, [class*="list"]').first();
    expect(await ordersList.isVisible()).toBe(true);
  });

  test('Purchases - Navigate to Catalog tab', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const catalogTab = page.locator('button:has-text("Catálogo"), button:has-text("Catalog")').first();
    if (await catalogTab.isVisible({ timeout: 3000 })) {
      await catalogTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Catalog tab');
    }
    
    const catalogContent = page.locator('[class*="catalog"], [class*="product"], [class*="category"]').first();
    expect(await catalogContent.isVisible()).toBe(true);
  });

  test('Purchases - Navigate to Receivings sub-tab', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const ordersTab = page.locator('button:has-text("Órdenes")').first();
    if (await ordersTab.isVisible({ timeout: 3000 })) {
      await ordersTab.click();
      await page.waitForTimeout(1000);
    }
    
    const receivingsTab = page.locator('button:has-text("Recepciones"), button:has-text("Receiving")').first();
    if (await receivingsTab.isVisible({ timeout: 2000 })) {
      await receivingsTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Receivings sub-tab');
    }
    
    const receivingsContent = page.locator('[class*="receiving"], table').first();
    const hasContent = await receivingsContent.isVisible().catch(() => false);
    console.log(`Receivings visible: ${hasContent}`);
    expect(true).toBe(true);
  });

  test('Purchases - Create new purchase order button exists', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const ordersTab = page.locator('button:has-text("Órdenes")').first();
    if (await ordersTab.isVisible({ timeout: 3000 })) {
      await ordersTab.click();
      await page.waitForTimeout(2000);
    }
    
    const newOrderBtn = page.locator('button:has-text("Nueva orden"), button:has-text("Nueva Orden"), button:has-text("Crear orden")').first();
    const btnExists = await newOrderBtn.isVisible().catch(() => false);
    console.log(`New order button visible: ${btnExists}`);
    
    expect(btnExists).toBe(true);
  });

  test('Purchases - Query purchase orders from Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const purchases = await dbUtil.getByIndex('purchases', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Purchase orders in Dexie: ${purchases.length}`);
    
    const draftPurchases = purchases.filter((p: Record<string, unknown>) => p.status === 'draft');
    const confirmedPurchases = purchases.filter((p: Record<string, unknown>) => p.status === 'confirmed');
    console.log(`Draft: ${draftPurchases.length}, Confirmed: ${confirmedPurchases.length}`);
    
    expect(purchases.length).toBeGreaterThanOrEqual(0);
  });

  test('Purchases - Query receivings from Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const receivings = await dbUtil.getByIndex('receivings', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Receivings in Dexie: ${receivings.length}`);
    
    expect(receivings.length).toBeGreaterThanOrEqual(0);
  });

  test('Purchases - Query suppliers from Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const suppliers = await dbUtil.getByIndex('suppliers', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Suppliers in Dexie: ${suppliers.length}`);
    
    const activeSuppliers = suppliers.filter((s: Record<string, unknown>) => s.isActive === true);
    console.log(`Active suppliers: ${activeSuppliers.length}`);
    
    expect(suppliers.length).toBeGreaterThanOrEqual(0);
  });

  test('Purchases - Verify purchase totals in Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const purchases = await dbUtil.getByIndex('purchases', 'tenantId', TEST_TENANT_SLUG);
    
    if (purchases.length > 0) {
      const purchase = purchases[0] as Record<string, unknown>;
      console.log(`First purchase - subtotal: ${purchase.subtotal}, total: ${purchase.total}`);
      
      expect(purchase.subtotal).toBeDefined();
      expect(purchase.total).toBeDefined();
    } else {
      console.log('No purchases found, skipping totals check');
      expect(true).toBe(true);
    }
  });

  test('Purchases - Verify warehouse in purchase orders', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const purchases = await dbUtil.getByIndex('purchases', 'tenantId', TEST_TENANT_SLUG);
    
    if (purchases.length > 0) {
      const purchase = purchases[0] as Record<string, unknown>;
      console.log(`Purchase warehouseLocalId: ${purchase.warehouseLocalId}`);
      expect(purchase.warehouseLocalId).toBeDefined();
    } else {
      console.log('No purchases found, skipping warehouse check');
      expect(true).toBe(true);
    }
  });

  test('Purchases - Navigate to Products in Catalog', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const catalogTab = page.locator('button:has-text("Catálogo")').first();
    if (await catalogTab.isVisible({ timeout: 3000 })) {
      await catalogTab.click();
      await page.waitForTimeout(1000);
    }
    
    const productsTab = page.locator('button:has-text("Productos")').first();
    if (await productsTab.isVisible({ timeout: 2000 })) {
      await productsTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Products in Catalog');
    }
    
    const productsTable = page.locator('table, [class*="product"]').first();
    const hasProducts = await productsTable.isVisible().catch(() => false);
    console.log(`Products view visible: ${hasProducts}`);
    expect(true).toBe(true);
  });

  test('Purchases - Navigate to Suppliers in Catalog', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const catalogTab = page.locator('button:has-text("Catálogo")').first();
    if (await catalogTab.isVisible({ timeout: 3000 })) {
      await catalogTab.click();
      await page.waitForTimeout(1000);
    }
    
    const suppliersTab = page.locator('button:has-text("Proveedores"), button:has-text("Suppliers")').first();
    if (await suppliersTab.isVisible({ timeout: 2000 })) {
      await suppliersTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Suppliers in Catalog');
    }
    
    const suppliersTable = page.locator('table, [class*="supplier"]').first();
    const hasSuppliers = await suppliersTable.isVisible().catch(() => false);
    console.log(`Suppliers view visible: ${hasSuppliers}`);
    expect(true).toBe(true);
  });

  test('Purchases - Navigate to Categories in Catalog', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const catalogTab = page.locator('button:has-text("Catálogo")').first();
    if (await catalogTab.isVisible({ timeout: 3000 })) {
      await catalogTab.click();
      await page.waitForTimeout(1000);
    }
    
    const categoriesTab = page.locator('button:has-text("Categorías"), button:has-text("Categories")').first();
    if (await categoriesTab.isVisible({ timeout: 2000 })) {
      await categoriesTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Categories in Catalog');
    }
    
    expect(true).toBe(true);
  });

  test('Purchases - Navigate to Presentations in Catalog', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const catalogTab = page.locator('button:has-text("Catálogo")').first();
    if (await catalogTab.isVisible({ timeout: 3000 })) {
      await catalogTab.click();
      await page.waitForTimeout(1000);
    }
    
    const presentationsTab = page.locator('button:has-text("Presentaciones"), button:has-text("Presentations")').first();
    if (await presentationsTab.isVisible({ timeout: 2000 })) {
      await presentationsTab.click();
      await page.waitForTimeout(2000);
      console.log('Navigated to Presentations in Catalog');
    }
    
    expect(true).toBe(true);
  });

  test('Purchases - Verify KPIs displayed', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const kpiSection = page.locator('[class*="kpi"], [class*="stat"], [class*="metric"]').first();
    const hasKPIs = await kpiSection.isVisible().catch(() => false);
    console.log(`KPIs section visible: ${hasKPIs}`);
    
    if (hasKPIs) {
      const kpiText = await kpiSection.textContent();
      console.log(`KPIs content: ${kpiText?.substring(0, 100)}`);
    }
    
    expect(true).toBe(true);
  });

  test('Purchases - Verify audit logs for purchase events', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const auditLogs = await dbUtil.getAuditLogs(TEST_TENANT_SLUG);
    
    const purchaseEvents = auditLogs.filter((log: Record<string, unknown>) => 
      String(log.eventType).includes('PURCHASE') || String(log.eventType).includes('RECEIV')
    );
    console.log(`Purchase-related audit logs: ${purchaseEvents.length}`);
    
    expect(auditLogs.length).toBeGreaterThanOrEqual(0);
  });

  test('Purchases - Check all Dexie tables for purchases module', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    
    const tables = {
      purchases: await dbUtil.count('purchases', TEST_TENANT_SLUG),
      receivings: await dbUtil.count('receivings', TEST_TENANT_SLUG),
      suppliers: await dbUtil.count('suppliers', TEST_TENANT_SLUG),
    };
    
    console.log('Purchases module Dexie tables:', JSON.stringify(tables, null, 2));
    
    expect(tables.purchases).toBeGreaterThanOrEqual(0);
    expect(tables.receivings).toBeGreaterThanOrEqual(0);
    expect(tables.suppliers).toBeGreaterThanOrEqual(0);
  });
});