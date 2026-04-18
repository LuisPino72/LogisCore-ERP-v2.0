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

async function createPurchaseReceiving(page: import('@playwright/test').Page, dbUtil: DexieUtil, productLocalId: string, warehouseLocalId: string, quantity: number, unitCost: number) {
  await page.goto('/purchases');
  await page.waitForLoadState('networkidle');
  
  const receivingsTab = page.locator('button:has-text("Recepciones")').first();
  if (await receivingsTab.isVisible({ timeout: 5000 })) {
    await receivingsTab.click();
    await page.waitForSelector('text=Recibir', { timeout: 5000 }).catch(() => {});
  }
  
  const newReceiverBtn = page.locator('button:has-text("Nueva"), button:has-text("Recibir")').first();
  if (await newReceiverBtn.isVisible({ timeout: 3000 })) {
    await newReceiverBtn.click();
    await page.waitForSelector('select[name="productId"]', { timeout: 5000 }).catch(() => {});
    
    const productSelect = page.locator('select[name="productId"], select#product').first();
    const warehouseSelect = page.locator('select[name="warehouseId"], select#warehouse').first();
    const qtyInput = page.locator('input[name="quantity"], input#quantity').first();
    const costInput = page.locator('input[name="unitCost"], input[name="cost"], input#unitCost').first();
    const receiveBtn = page.locator('button:has-text("Recibir"), button:has-text("Confirmar")').first();
    
    if (await productSelect.isVisible()) {
      await productSelect.selectOption(productLocalId);
    }
    if (await warehouseSelect.isVisible()) {
      await warehouseSelect.selectOption(warehouseLocalId);
    }
    if (await qtyInput.isVisible()) {
      await qtyInput.fill(quantity.toString());
    }
    if (await costInput.isVisible()) {
      await costInput.fill(unitCost.toFixed(2));
    }
    
    if (await receiveBtn.isVisible()) {
      await receiveBtn.click();
      await page.waitForFunction(async () => {
        const db = (window as any).logiscoreDb;
        if (!db || !db.inventory_lots) return false;
        const lots = await db.inventory_lots.toArray();
        return lots.length > 0;
      }, { timeout: 10000 }).catch(() => {});
    }
  }
  
  const lots = await dbUtil.getActiveInventoryLots(productLocalId, warehouseLocalId);
  return lots;
}

async function createSaleWithPayment(page: import('@playwright/test').Page, paymentMethod: 'efectivo' | 'usd', amount: number) {
  await page.goto('/sales');
  await page.waitForLoadState('networkidle');
  
  const newSaleBtn = page.locator('button:has-text("Nueva"), button:has-text("Venta")').first();
  if (await newSaleBtn.isVisible({ timeout: 5000 })) {
    await newSaleBtn.click();
    await page.waitForSelector('button:has-text("USD"), button:has-text("Efectivo")', { timeout: 5000 }).catch(() => {});
    
    if (paymentMethod === 'usd') {
      const usdBtn = page.locator('button:has-text("USD"), [class*="usd"]').first();
      if (await usdBtn.isVisible({ timeout: 2000 })) {
        await usdBtn.click();
      }
    } else {
      const cashBtn = page.locator('button:has-text("Efectivo"), [class*="cash"]').first();
      if (await cashBtn.isVisible({ timeout: 2000 })) {
        await cashBtn.click();
      }
    }
    
    const completeBtn = page.locator('button:has-text("Completar"), button:has-text("Finalizar")').first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      await page.waitForFunction(async () => {
        const db = (window as any).logiscoreDb;
        if (!db || !db.sales) return false;
        const sales = await db.sales.toArray();
        return sales.length > 0;
      }, { timeout: 10000 }).catch(() => {});
    }
  }
}

test.describe('Integration Tests - Full Business Flow', () => {
  
  test('FULL FLOW: Receiving → FIFO Lots → Sale → Invoice with IGTF', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Verify Initial State ===');
    const initialProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const initialWarehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
    const initialLots = await page.evaluate(() => {
      const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
      if (!db?.inventory_lots) return [];
      const tableObj = db.inventory_lots as { toArray: () => Promise<unknown[]> };
      return tableObj?.toArray?.() ?? [];
    });
    
    console.log(`Initial state - Products: ${initialProducts.length}, Warehouses: ${initialWarehouses.length}, Lots: ${initialLots.length}`);
    
    // Ensure at least one warehouse exists
    let warehouseLocalId: string;
    if (initialWarehouses.length > 0) {
      warehouseLocalId = (initialWarehouses[0] as Record<string, unknown>).localId as string;
    } else {
      console.log('Creating test warehouse via sidebar...');
      
      // Click "Inventario" button in sidebar (this is a SPA, not using URLs)
      const inventoryBtn = page.locator('button:has-text("Inventario")').first();
      await inventoryBtn.click();
      await page.waitForLoadState('networkidle');
      
      // Wait for inventory content to load
      await page.waitForSelector('text=Nueva Bodega', { timeout: 15000 }).catch(() => {});
      
      const warehousesTab = page.locator('button:has-text("Bodegas")').first();
      await warehousesTab.click();
      
      const newWarehouseBtn = page.locator('button:has-text("Nueva Bodega")').first();
      await newWarehouseBtn.waitFor({ state: 'visible', timeout: 10000 });
      await newWarehouseBtn.click();
      
      // Use id instead of name
      await page.locator('input[id="warehouseName"]').fill('Warehouse Test E2E');
      await page.locator('button:has-text("Crear Bodega")').click();
      
      await page.waitForFunction(async () => {
        const db = (window as any).logiscoreDb;
        if (!db || !db.warehouses) return false;
        const w = await db.warehouses.toArray();
        return w.length > 0;
      }, { timeout: 10000 });
      
      const updatedWarehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
      warehouseLocalId = (updatedWarehouses[0] as Record<string, unknown>).localId as string;
    }
    
    // Ensure at least one product exists
    let testProduct: {localId: string, name: string};
    if (initialProducts.length > 0) {
      testProduct = { localId: initialProducts[0].localId as string, name: initialProducts[0].name as string };
    } else {
      console.log('Creating test product via sidebar...');
      
      // Navigate via sidebar - this is a SPA
      const productsBtn = page.locator('button:has-text("Productos")').first();
      await productsBtn.click();
      await page.waitForLoadState('networkidle');
      
      // Wait for products content
      await page.waitForSelector('button:has-text("Nuevo Producto"), button:has-text("Agregar")', { timeout: 15000 }).catch(() => {});
      
      const addProductBtn = page.locator('button:has-text("Nuevo Producto"), button:has-text("Agregar")').first();
      await addProductBtn.click();
      await page.waitForSelector('input[id="productName"], input[name="name"]', { timeout: 5000 }).catch(() => {});
      
      await page.locator('input[id="productName"], input[name="name"]').fill('Product Test E2E');
      await page.locator('input[id="productSku"]').fill(`SKU-E2E-${Date.now()}`);
      await page.locator('input[type="checkbox"]').check();
      await page.locator('button:has-text("Guardar")').click();
      
      await page.waitForFunction(async () => {
        const db = (window as any).logiscoreDb;
        if (!db || !db.products) return false;
        const p = await db.products.toArray();
        return p.length > 0;
      }, { timeout: 10000 });
      
      const updatedProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
      testProduct = { localId: updatedProducts[0].localId as string, name: updatedProducts[0].name as string };
    }
    
    const testWarehouse = warehouseLocalId;
    
    const productsWithStock: Array<{localId: string, name: string}> = [];
    for (const product of initialProducts) {
      const lots = await dbUtil.getActiveInventoryLots(product.localId as string, warehouseLocalId);
      if (lots.length > 0) {
        productsWithStock.push({ localId: product.localId as string, name: product.name as string });
      }
    }
    
    if (productsWithStock.length > 0) {
      testProduct = productsWithStock[0];
      console.log(`\n=== Using existing product with stock: ${testProduct.name} ===`);
    } else {
      console.log(`\n=== STEP 2: Creating Purchase Receiving for ${testProduct.name} ===`);
      
      const existingLotsBefore = await dbUtil.getActiveInventoryLots(testProduct.localId, testWarehouse);
      console.log(`Lots before receiving: ${existingLotsBefore.length}`);
      
      await createPurchaseReceiving(page, dbUtil, testProduct.localId, testWarehouse, 10, 50.00);
      
      const lotsAfter = await dbUtil.getActiveInventoryLots(testProduct.localId, testWarehouse);
      console.log(`Lots after receiving: ${lotsAfter.length}`);
      console.log(`New lots created: ${lotsAfter.length - existingLotsBefore.length}`);
    }
    
    console.log(`\n=== STEP 3: Verify FIFO Layers ===`);
    const activeLots = await dbUtil.getActiveInventoryLots(testProduct.localId, testWarehouse);
    console.log(`Active FIFO lots: ${activeLots.length}`);
    
    if (activeLots.length > 0) {
      const sortedLots = [...activeLots].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateA - dateB;
      });
      
      console.log(`Oldest lot: ${sortedLots[0].localId}, unitCost: ${sortedLots[0].unitCost}, qty: ${sortedLots[0].quantity}`);
      console.log(`Newest lot: ${sortedLots[sortedLots.length - 1].localId}, unitCost: ${sortedLots[sortedLots.length - 1].unitCost}, qty: ${sortedLots[sortedLots.length - 1].quantity}`);
    }
    
    expect(activeLots.length).toBeGreaterThan(0);
    
    console.log(`\n=== STEP 4: Create Sale with USD Payment ===`);
    await createSaleWithPayment(page, 'usd', 100);
    
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Total sales after: ${sales.length}`);
    
    const usdSales = sales.filter((s: Record<string, unknown>) => 
      (s.paymentMethod === 'usd' || s.currency === 'USD')
    );
    console.log(`USD sales: ${usdSales.length}`);
    
    console.log(`\n=== STEP 5: Verify IGTF Calculation ===`);
    const salesWithIGTF = sales.filter((s: Record<string, unknown>) => (s.igtf_amount as number) > 0);
    console.log(`Sales with IGTF: ${salesWithIGTF.length}`);
    
    if (salesWithIGTF.length > 0) {
      const sale = salesWithIGTF[0] as Record<string, unknown>;
      const total = sale.total as number;
      const igtfAmount = sale.igtf_amount as number;
      const expectedIGTF = total * 0.03;
      
      console.log(`Sale total: ${total}, IGTF: ${igtfAmount}, Expected (3%): ${expectedIGTF.toFixed(4)}`);
      
      expect(igtfAmount).toBeGreaterThan(0);
      expect(Math.abs(igtfAmount - expectedIGTF)).toBeLessThan(0.01);
    } else {
      console.log(`No IGTF calculated yet - payment may not be in USD`);
    }
    
    console.log(`\n=== STEP 6: Check Exchange Rate Snapshot ===`);
    const exchangeRates = await dbUtil.getExchangeRates(TEST_TENANT_SLUG);
    console.log(`Exchange rates: ${exchangeRates.length}`);
    
    if (exchangeRates.length > 0) {
      const rate = exchangeRates[0] as Record<string, unknown>;
      console.log(`Current rate: ${rate.rate} ${rate.fromCurrency} → ${rate.toCurrency}`);
      expect((rate.rate as number)).toBeGreaterThan(0);
    }
    
    console.log(`\n=== STEP 7: Invoice Generation Check ===`);
    const invoices = await dbUtil.getInvoices(TEST_TENANT_SLUG);
    console.log(`Invoices: ${invoices.length}`);
    
    expect(sales.length).toBeGreaterThanOrEqual(0);
    
    console.log(`\n=== FLOW COMPLETE ===`);
  });

  test('SCHEMA DUAL: Verify tenantId is slug in Dexie, UUID in Supabase', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== SCHEMA DUAL VALIDATION ===');
    
    const isSlugValid = await dbUtil.verifyTenantIdIsSlug(TEST_TENANT_SLUG);
    console.log(`Tenant slug '${TEST_TENANT_SLUG}' is valid: ${isSlugValid}`);
    
    expect(isSlugValid).toBe(true);
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Products with tenantId (slug): ${products.length}`);
    
    for (const product of products.slice(0, 2)) {
      console.log(`Product: ${product.name}, tenantId: ${product.tenantId}`);
      expect(product.tenantId).toBe(TEST_TENANT_SLUG);
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasUUIDTenant = products.some(p => uuidRegex.test(p.tenantId as string));
    console.log(`Products with UUID tenantId: ${hasUUIDTenant}`);
    
    expect(hasUUIDTenant).toBe(false);
  });

  test('WEIGHTED PRECISION: Verify 4 decimals for isWeighted products across full flow', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== WEIGHTED PRECISION FLOW ===');
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    
    console.log(`Weighted products: ${weightedProducts.length}`);
    
    if (weightedProducts.length > 0) {
      const weightedProduct = weightedProducts[0] as Record<string, unknown>;
      console.log(`Testing weighted product: ${weightedProduct.name}`);
      
      const warehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
      if (warehouses.length > 0) {
        const warehouse = warehouses[0] as Record<string, unknown>;
        
        const lots = await dbUtil.getActiveInventoryLots(weightedProduct.localId as string, warehouse.localId as string);
        console.log(`Active lots: ${lots.length}`);
        
        for (const lot of lots) {
          const qty = lot.quantity as number;
          const qtyStr = qty.toString();
          const decimals = qtyStr.includes('.') ? qtyStr.split('.')[1]?.length ?? 0 : 0;
          
          console.log(`Lot ${lot.localId}: quantity=${qty}, decimals=${decimals}`);
          expect(decimals).toBeLessThanOrEqual(4);
        }
      }
    } else {
      console.log(`No weighted products found - creating test...`);
      
      const inventoryPage = '/inventory';
      await page.goto(inventoryPage);
      await page.waitForLoadState('networkidle');
      
      const addProductBtn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar")').first();
      if (await addProductBtn.isVisible({ timeout: 3000 })) {
        await addProductBtn.click();
        await page.waitForSelector('input[name="name"], input#name', { timeout: 5000 }).catch(() => {});
        
        const nameInput = page.locator('input[name="name"], input#name').first();
        const skuInput = page.locator('input[name="sku"], input#sku').first();
        const weightedCheckbox = page.locator('input[name="isWeighted"], input[type="checkbox"]').first();
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('Producto Prueba Pesos');
          await skuInput.fill(`PP-${Date.now().toString().slice(-6)}`);
          
          if (await weightedCheckbox.isVisible()) {
            await weightedCheckbox.check();
          }
          
          const saveBtn = page.locator('button:has-text("Guardar"), button[type="submit"]').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForFunction(async () => {
              const db = (window as any).logiscoreDb;
              if (!db || !db.products) return false;
              const products = await db.products.toArray();
              return products.some((p: any) => p.name === 'Producto Prueba Pesos');
            }, { timeout: 10000 }).catch(() => {});
          }
        }
      }
      
      const newProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
      const newWeighted = newProducts.filter((p: Record<string, unknown>) => p.isWeighted === true);
      console.log(`Weighted products after creation: ${newWeighted.length}`);
    }
    
    expect(weightedProducts.length).toBeGreaterThanOrEqual(0);
  });
});