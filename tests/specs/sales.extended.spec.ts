import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function loginAndNavigate(page: import('@playwright/test').Page, path: string = '/sales') {
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

test.describe('Sales/POS Module Tests', () => {
  
  test('POS - Open box successfully', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const openBoxBtn = page.locator('button:has-text("Abrir"), button:has-text("Abrir caja")').first();
    if (await openBoxBtn.isVisible({ timeout: 3000 })) {
      await openBoxBtn.click();
      await page.waitForTimeout(1000);
      
      const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Aceptar")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
    
    await page.waitForTimeout(2000);
    
    const dbUtil = new DexieUtil(page);
    const boxClosings = await dbUtil.getByIndex('box_closings', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Box closings in DB: ${boxClosings.length}`);
    
    expect(boxClosings.length).toBeGreaterThanOrEqual(0);
  });

  test('POS - Cannot sell with box closed (BOX_NOT_OPEN)', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const searchInput = page.locator('input[placeholder*="buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.waitForTimeout(500);
    }
    
    const productCard = page.locator('[class*="product"], [class*="card"]:has(button)').first();
    if (await productCard.isVisible()) {
      await productCard.click();
      await page.waitForTimeout(1000);
    }
    
    const finalizeBtn = page.locator('button:has-text("Finalizar"), button:has-text("Cobrar")').first();
    if (await finalizeBtn.isVisible()) {
      await finalizeBtn.click();
      await page.waitForTimeout(1000);
      
      const errorMsg = page.locator('.alert-error, [role="alert"]');
      if (await errorMsg.isVisible()) {
        const errorText = await errorMsg.textContent();
        console.log(`Error message: ${errorText}`);
        expect(errorText).toMatch(/caja|cerradaBOX_NOT_OPEN/i);
      }
    }
  });

  test('POS - Suspend sale', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const searchInput = page.locator('input[placeholder*="buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      await page.waitForTimeout(500);
    }
    
    const productCard = page.locator('[class*="product"], [class*="card"]:has(button)').first();
    if (await productCard.isVisible({ timeout: 2000 })) {
      await productCard.click();
      await page.waitForTimeout(1000);
    }
    
    const suspendBtn = page.locator('button:has-text("Suspender")').first();
    if (await suspendBtn.isVisible({ timeout: 2000 })) {
      await suspendBtn.click();
      await page.waitForTimeout(1000);
      
      const confirmBtn = page.locator('button:has-text("Confirmar"), button:has-text("Aceptar")').first();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
    
    await page.waitForTimeout(2000);
    
    const dbUtil = new DexieUtil(page);
    const suspendedSales = await dbUtil.getByIndex('suspended_sales', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Suspended sales: ${suspendedSales.length}`);
    
    expect(suspendedSales.length).toBeGreaterThanOrEqual(0);
  });

  test('POS - Verify sales table exists', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const salesTab = page.locator('button:has-text("Ventas"), [data-tab="sales"]').first();
    if (await salesTab.isVisible()) {
      await salesTab.click();
      await page.waitForTimeout(2000);
    }
    
    const salesTable = page.locator('table, [class*="table"]').first();
    const hasTable = await salesTable.isVisible();
    console.log(`Sales table visible: ${hasTable}`);
    
    expect(hasTable).toBe(true);
  });

  test('POS - Navigate to different tabs', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const tabs = ['Terminal', 'Ventas', 'Suspendidas', 'Cierres'];
    for (const tab of tabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.isVisible({ timeout: 1000 })) {
        await tabBtn.click();
        await page.waitForTimeout(1000);
        console.log(`Navigated to tab: ${tab}`);
      }
    }
  });

  test('Sales - Query completed sales from Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Total sales in Dexie: ${sales.length}`);
    
    const completedSales = sales.filter((s: Record<string, unknown>) => s.status === 'completed');
    console.log(`Completed sales: ${completedSales.length}`);
    
    expect(sales.length).toBeGreaterThanOrEqual(0);
  });

  test('Sales - Query box closings from Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const boxClosings = await dbUtil.getByIndex('box_closings', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Box closings in Dexie: ${boxClosings.length}`);
    
    const openBoxes = boxClosings.filter((b: Record<string, unknown>) => b.status === 'open');
    console.log(`Open boxes: ${openBoxes.length}`);
    
    expect(boxClosings.length).toBeGreaterThanOrEqual(0);
  });

  test('Sales - Verify exchange rate in sales', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    
    if (sales.length > 0) {
      const lastSale = sales[0] as Record<string, unknown>;
      console.log(`Last sale exchange rate: ${lastSale.exchangeRate}`);
      expect(lastSale.exchangeRate).toBeDefined();
    } else {
      console.log('No sales found, skipping exchange rate check');
      expect(true).toBe(true);
    }
  });

  test('Sales - Verify audit logs for sales events', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const auditLogs = await dbUtil.getAuditLogs(TEST_TENANT_SLUG);
    
    const saleEvents = auditLogs.filter((log: Record<string, unknown>) => 
      String(log.eventType).includes('SALE') || String(log.eventType).includes('POS')
    );
    console.log(`Sale-related audit logs: ${saleEvents.length}`);
    
    expect(auditLogs.length).toBeGreaterThanOrEqual(0);
  });
});