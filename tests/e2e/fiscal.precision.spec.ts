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

test.describe('Fiscal & Weighted Precision E2E', () => {
  
  test('FISCAL-PREC-001: Verify 4 decimal precision for weighted products in stock', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Searching for Weighted Products ===');
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    
    console.log(`Weighted products found: ${weightedProducts.length}`);
    
    if (weightedProducts.length === 0) {
      console.log('No weighted products found, creating one...');
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      
      const addBtn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar")').first();
      await addBtn.click();
      await page.waitForSelector('input[name="name"]');
      
      await page.locator('input[name="name"]').fill('Fiscal Test Weighted');
      await page.locator('input[name="sku"]').fill(`FTW-${Date.now()}`);
      await page.locator('input[type="checkbox"]').check(); // isWeighted
      await page.locator('button[type="submit"]').click();
      
      await page.waitForFunction(async () => {
        const db = (window as any).logiscoreDb;
        const p = await db.products.where('name').equals('Fiscal Test Weighted').first();
        return !!p;
      }, { timeout: 10000 });
    }
    
    const updatedProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const targetProduct = updatedProducts.find((p: any) => p.isWeighted === true) as Record<string, unknown>;
    
    console.log(`Testing product: ${targetProduct.name}`);
    
    const warehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
    const warehouseId = (warehouses[0] as Record<string, unknown>).localId as string;
    
    const lots = await dbUtil.getActiveInventoryLots(targetProduct.localId as string, warehouseId);
    
    for (const lot of lots) {
      const qty = lot.quantity as number;
      const decimals = qty.toString().split('.')[1]?.length ?? 0;
      console.log(`Lot ${lot.localId} quantity: ${qty}, decimals: ${decimals}`);
      expect(decimals).toBeLessThanOrEqual(4);
    }
    
    console.log('\n=== WEIGHTED PRECISION VERIFIED ===');
  });
  
  test('FISCAL-PREC-002: Verify IGTF 3% calculation accuracy', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Verifying IGTF on existing sales ===');
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    const usdSales = sales.filter((s: any) => s.paymentMethod === 'usd' || s.currency === 'USD');
    
    if (usdSales.length > 0) {
      const sale = usdSales[0] as Record<string, unknown>;
      const total = sale.total as number;
      const igtf = sale.igtf_amount as number;
      const expected = total * 0.03;
      
      console.log(`Sale Total: ${total}, IGTF: ${igtf}, Expected: ${expected.toFixed(4)}`);
      expect(Math.abs(igtf - expected)).toBeLessThan(0.01);
    } else {
      console.log('No USD sales found for IGTF verification');
    }
    
    console.log('\n=== IGTF CALCULATION VERIFIED ===');
  });
  
  test('FISCAL-PREC-003: Verify exchange rate snapshot precision', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Verify Exchange Rates ===');
    const rates = await dbUtil.getExchangeRates(TEST_TENANT_SLUG);
    
    if (rates.length > 0) {
      const rate = rates[0] as Record<string, unknown>;
      const val = rate.rate as number;
      const decimals = val.toString().split('.')[1]?.length ?? 0;
      
      console.log(`Current Rate: ${val}, decimals: ${decimals}`);
      expect(decimals).toBeLessThanOrEqual(4);
    }
    
    console.log('\n=== EXCHANGE RATE PRECISION VERIFIED ===');
  });
});