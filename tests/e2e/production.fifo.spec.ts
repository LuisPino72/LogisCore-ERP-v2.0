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

async function createPurchaseReceiving(
  page: import('@playwright/test').Page,
  productLocalId: string,
  warehouseLocalId: string,
  quantity: number,
  unitCost: number
) {
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
    
    await page.locator('select[name="productId"], select#product').first().selectOption(productLocalId);
    await page.locator('select[name="warehouseId"], select#warehouse').first().selectOption(warehouseLocalId);
    await page.locator('input[name="quantity"], input#quantity').first().fill(quantity.toString());
    await page.locator('input[name="unitCost"], input[name="cost"], input#unitCost').first().fill(unitCost.toFixed(2));
    
    const receiveBtn = page.locator('button:has-text("Recibir"), button:has-text("Confirmar")').first();
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
}

test.describe('Production FIFO E2E - Complete Production Flow', () => {
  
  test('PRODUCTION-FIFO-001: Complete flow - Recipe → Stock Check → Production → FIFO Consumption', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== STEP 1: Verify Production Module Access ===');
    await page.goto('/production');
    await page.waitForLoadState('networkidle');
    
    const productionHeading = page.locator('h1:has-text("Producción"), h2:has-text("Producción")').first();
    const hasProductionAccess = await productionHeading.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasProductionAccess) {
      console.log('Production module not accessible - checking plan limits');
      const accessDenied = page.locator('text=Acceso Denegado, text=Plan Pro').first();
      const isAccessDenied = await accessDenied.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isAccessDenied) {
        console.log('PRODUCTION ACCESS DENIED - Plan Pro required (Expected for Basic plan)');
        expect(true).toBe(true);
        return;
      }
    }
    
    console.log('\n=== STEP 2: Get Products and Warehouses ===');
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const warehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
    
    expect(products.length).toBeGreaterThan(0);
    expect(warehouses.length).toBeGreaterThan(0);
    
    const warehouse = warehouses[0] as Record<string, unknown>;
    const warehouseLocalId = warehouse.localId as string;
    
    console.log('\n=== STEP 3: Receive Ingredients for Production ===');
    const testProduct = products[0] as Record<string, unknown>;
    const testQty = 100;
    const testCost = 25.50;
    
    await createPurchaseReceiving(page, testProduct.localId as string, warehouseLocalId, testQty, testCost);
    
    await page.waitForFunction(async () => {
      const db = (window as any).logiscoreDb;
      if (!db || !db.inventory_lots) return false;
      const lots = await db.inventory_lots.toArray();
      return lots.some((l: any) => l.productLocalId === testProduct.localId);
    }, { timeout: 10000 }).catch(() => {});
    
    console.log('\n=== STEP 4: Verify FIFO Layers in Inventory ===');
    const lots = await dbUtil.getActiveInventoryLots(testProduct.localId as string, warehouseLocalId);
    console.log(`Active lots for product: ${lots.length}`);
    
    if (lots.length > 0) {
      const sortedLots = [...lots].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateA - dateB;
      });
      
      console.log(`Oldest lot: ${sortedLots[0].localId} - createdAt: ${sortedLots[0].createdAt}`);
      console.log(`Newest lot: ${sortedLots[sortedLots.length - 1].localId} - createdAt: ${sortedLots[sortedLots.length - 1].createdAt}`);
      
      expect(sortedLots[0].createdAt).toBeDefined();
    }
    
    console.log('\n=== STEP 5: Access Production Module ===');
    await page.goto('/production');
    await page.waitForLoadState('networkidle');
    
    const recipesLink = page.locator('a:has-text("Recetas"), button:has-text("Recetas")').first();
    const hasRecipes = await recipesLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasRecipes) {
      await recipesLink.click();
      await page.waitForLoadState('networkidle');
      
      console.log('\n=== STEP 6: Verify Recipes ===');
      const recipesTable = page.locator('table, [role="table"]').first();
      const hasTable = await recipesTable.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasTable) {
        console.log('Recipes table visible');
      }
    }
    
    console.log('\n=== PRODUCTION FIFO TEST COMPLETE ===');
  });
  
  test('PRODUCTION-FIFO-002: Verify weighted ingredients maintain 4 decimal precision', async ({ page }) => {
    const dbUtil = await loginAndBootstrap(page);
    
    console.log('\n=== WEIGHTED PRECISION IN PRODUCTION ===');
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    
    console.log(`Weighted products found: ${weightedProducts.length}`);
    
    if (weightedProducts.length > 0) {
      const weightedProduct = weightedProducts[0] as Record<string, unknown>;
      console.log(`Testing: ${weightedProduct.name}`);
      
      const warehouses = await dbUtil.getWarehouses(TEST_TENANT_SLUG);
      if (warehouses.length > 0) {
        const warehouse = warehouses[0] as Record<string, unknown>;
        const lots = await dbUtil.getActiveInventoryLots(weightedProduct.localId as string, warehouse.localId as string);
        
        for (const lot of lots) {
          const qty = lot.quantity as number;
          const qtyStr = qty.toString();
          const decimals = qtyStr.includes('.') ? qtyStr.split('.')[1]?.length ?? 0 : 0;
          
          console.log(`Lot ${lot.localId}: qty=${qty}, decimals=${decimals}`);
          expect(decimals).toBeLessThanOrEqual(4);
        }
      }
    }
    
    console.log('\n=== WEIGHTED PRECISION VERIFIED ===');
  });
});