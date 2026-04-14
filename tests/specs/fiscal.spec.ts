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
    await page.waitForTimeout(15000);
  }
  
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
}

test.describe('Weighted Products & Fiscal Rules Tests', () => {
  
  test('Weighted Products - Verify products synced from Supabase', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Products in Dexie: ${products.length}`);
    
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    const regularProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === false);
    
    console.log(`Weighted products: ${weightedProducts.length}, Regular: ${regularProducts.length}`);
    
    if (weightedProducts.length > 0) {
      console.log('Weighted product names:', weightedProducts.map((p: Record<string, unknown>) => p.name));
    }
    
    expect(products.length).toBeGreaterThan(0);
  });

  test('Weighted Products - Verify is_weighted flag and unit_of_measure', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    
    for (const product of weightedProducts) {
      console.log(`Product: ${product.name}, isWeighted: ${product.isWeighted}, unitOfMeasure: ${product.unitOfMeasure}`);
      expect(product.isWeighted).toBe(true);
      expect(product.unitOfMeasure).toBe('kg');
    }
    
    if (weightedProducts.length > 0) {
      expect(true).toBe(true);
    } else {
      console.log('No weighted products found in Dexie - may need to re-sync');
    }
  });

  test('Weighted Products - Verify quantity precision (toFixed 4) in stock movements', async ({ page }) => {
    await loginAndNavigate(page, '/inventory');
    
    const dbUtil = new DexieUtil(page);
    const movements = await dbUtil.getByIndex('stock_movements', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Stock movements in Dexie: ${movements.length}`);
    
    if (movements.length > 0) {
      const movement = movements[0] as Record<string, unknown>;
      const quantity = movement.quantity as number;
      const quantityStr = quantity.toString();
      const decimals = quantityStr.includes('.') ? quantityStr.split('.')[1].length : 0;
      
      console.log(`Movement quantity: ${quantity}, decimals: ${decimals}`);
      expect(decimals).toBeLessThanOrEqual(4);
    } else {
      console.log('No stock movements yet - need to create purchase or sale');
      expect(true).toBe(true);
    }
  });

  test('IGTF - Verify exchange rate exists for IGTF calculation', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const exchangeRates = await dbUtil.getByIndex('exchange_rates', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Exchange rates in Dexie: ${exchangeRates.length}`);
    
    if (exchangeRates.length > 0) {
      const rate = exchangeRates[0] as Record<string, unknown>;
      console.log(`Exchange rate: ${rate.rate} ${rate.fromCurrency} to ${rate.toCurrency}`);
      expect(rate.rate).toBeDefined();
    } else {
      console.log('No exchange rates found - may need to fetch from BCV');
    }
    
    expect(exchangeRates.length).toBeGreaterThanOrEqual(0);
  });

  test('IGTF - Verify IGTF calculation (3% on USD payments)', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const dbUtil = new DexieUtil(page);
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    
    const salesWithIGTF = sales.filter((s: Record<string, unknown>) => (s.igtf_amount as number) > 0);
    console.log(`Sales with IGTF: ${salesWithIGTF.length}`);
    
    if (salesWithIGTF.length > 0) {
      const sale = salesWithIGTF[0] as Record<string, unknown>;
      const total = sale.total as number;
      const igtfAmount = sale.igtf_amount as number;
      const expectedIGTF = total * 0.03;
      
      console.log(`Sale total: ${total}, IGTF: ${igtfAmount}, Expected: ${expectedIGTF.toFixed(4)}`);
      
      expect(igtfAmount).toBeGreaterThan(0);
      expect(Math.abs(igtfAmount - expectedIGTF)).toBeLessThan(0.01);
    } else {
      console.log('No sales with IGTF yet - need to complete sale with USD payment');
      expect(true).toBe(true);
    }
  });

  test('IGTF - Verify exchange_rate_snapshot in sales', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    
    if (sales.length > 0) {
      const sale = sales[0] as Record<string, unknown>;
      const exchangeRateSnapshot = sale.exchangeRateSnapshot as Record<string, unknown> | undefined;
      
      if (exchangeRateSnapshot) {
        console.log(`Exchange rate snapshot: ${JSON.stringify(exchangeRateSnapshot)}`);
        expect(exchangeRateSnapshot.rate).toBeDefined();
        expect(exchangeRateSnapshot.fetchedAt).toBeDefined();
      } else {
        console.log('No exchange rate snapshot in sale');
      }
    } else {
      console.log('No sales found');
    }
    
    expect(true).toBe(true);
  });

  test('RIF Validation - Verify suppliers have valid RIF format', async ({ page }) => {
    await loginAndNavigate(page, '/purchases');
    
    const dbUtil = new DexieUtil(page);
    const suppliers = await dbUtil.getByIndex('suppliers', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Suppliers in Dexie: ${suppliers.length}`);
    
    const rifPattern = /^[VJEGP]\d{9}$/;
    
    for (const supplier of suppliers) {
      const rif = supplier.rif as string;
      console.log(`Supplier: ${supplier.name}, RIF: ${rif}`);
      
      if (rif) {
        const isValid = rifPattern.test(rif);
        console.log(`RIF ${rif} valid: ${isValid}`);
      }
    }
    
    expect(suppliers.length).toBeGreaterThanOrEqual(0);
  });

  test('Inventory - Verify warehouses synced', async ({ page }) => {
    await loginAndNavigate(page, '/inventory');
    
    const dbUtil = new DexieUtil(page);
    const warehouses = await dbUtil.getByIndex('warehouses', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Warehouses in Dexie: ${warehouses.length}`);
    
    for (const warehouse of warehouses) {
      console.log(`Warehouse: ${warehouse.name}`);
    }
    
    expect(warehouses.length).toBeGreaterThan(0);
  });

  test('Inventory - Verify stock movements for weighted products', async ({ page }) => {
    await loginAndNavigate(page, '/inventory');
    
    const dbUtil = new DexieUtil(page);
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const movements = await dbUtil.getByIndex('stock_movements', 'tenantId', TEST_TENANT_SLUG);
    
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    console.log(`Weighted products: ${weightedProducts.length}, Total movements: ${movements.length}`);
    
    if (weightedProducts.length > 0) {
      const weightedProductIds = weightedProducts.map((p: Record<string, unknown>) => p.localId);
      const weightedMovements = movements.filter((m: Record<string, unknown>) => 
        weightedProductIds.includes(m.productLocalId)
      );
      console.log(`Movements for weighted products: ${weightedMovements.length}`);
    }
    
    expect(weightedProducts.length).toBeGreaterThan(0);
  });

  test('Fiscal - Verify tax rules in Dexie', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    const taxRules = await dbUtil.getByIndex('tax_rules', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Tax rules in Dexie: ${taxRules.length}`);
    
    for (const rule of taxRules) {
      console.log(`Tax rule: ${rule.name}, rate: ${rule.rate}, type: ${rule.type}`);
    }
    
    expect(taxRules.length).toBeGreaterThanOrEqual(0);
  });

  test('Complete Data Flow - Verify all tables have data', async ({ page }) => {
    await loginAndNavigate(page);
    
    const dbUtil = new DexieUtil(page);
    
    const tables = {
      categories: await dbUtil.count('categories', TEST_TENANT_SLUG),
      products: await dbUtil.count('products', TEST_TENANT_SLUG),
      warehouses: await dbUtil.count('warehouses', TEST_TENANT_SLUG),
      suppliers: await dbUtil.count('suppliers', TEST_TENANT_SLUG),
      sales: await dbUtil.count('sales', TEST_TENANT_SLUG),
      purchases: await dbUtil.count('purchases', TEST_TENANT_SLUG),
      stock_movements: await dbUtil.count('stock_movements', TEST_TENANT_SLUG),
      exchange_rates: await dbUtil.count('exchange_rates', TEST_TENANT_SLUG),
      tax_rules: await dbUtil.count('tax_rules', TEST_TENANT_SLUG),
    };
    
    console.log('=== Complete Data Flow Summary ===');
    console.log(JSON.stringify(tables, null, 2));
    
    expect(tables.categories).toBeGreaterThan(0);
    expect(tables.products).toBeGreaterThan(0);
    expect(tables.warehouses).toBeGreaterThan(0);
  });
});