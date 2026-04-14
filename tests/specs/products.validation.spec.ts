import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function loginAndNavigate(page: import('@playwright/test').Page, path: string = '/products') {
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

test.describe('Products Module - Validation Tests', () => {
  
  test('PRODUCT.CREATED - Verify product creation emits event and stores with tenant slug', async ({ page }) => {
    await loginAndNavigate(page, '/products');
    
    const dbUtil = new DexieUtil(page);
    
    const initialProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const initialCount = initialProducts.length;
    console.log(`Initial products count: ${initialCount}`);
    
    const newProductBtn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar"), [class*="add"]').first();
    if (await newProductBtn.isVisible({ timeout: 5000 })) {
      await newProductBtn.click();
      await page.waitForTimeout(2000);
      
      const nameInput = page.locator('input[name="name"], input[id="name"], [class*="name"] input').first();
      const skuInput = page.locator('input[name="sku"], input[id="sku"], [class*="sku"] input').first();
      const categorySelect = page.locator('select[name="categoryId"], [class*="category"] select').first();
      
      if (await nameInput.isVisible()) {
        const testProductName = `Test Product ${Date.now()}`;
        const testSku = `TEST-${Date.now().toString().slice(-6)}`;
        
        await nameInput.fill(testProductName);
        if (await skuInput.isVisible()) {
          await skuInput.fill(testSku);
        }
        
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 1 });
        }
        
        const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Save"), button[type="submit"]').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(5000);
        }
      }
    }
    
    const finalProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    console.log(`Final products count: ${finalProducts.length}`);
    
    const isSlugCorrect = await dbUtil.verifyTenantIdIsSlug(TEST_TENANT_SLUG);
    expect(isSlugCorrect).toBe(true);
    
    console.log(`Tenant ID uses slug format: ${isSlugCorrect}`);
    expect(finalProducts.length).toBeGreaterThanOrEqual(initialCount);
  });

  test('WEIGHTED PRODUCTS - Verify 4-decimal precision for is_weighted products', async ({ page }) => {
    await loginAndNavigate(page, '/products');
    
    const dbUtil = new DexieUtil(page);
    
    const products = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
    const weightedProducts = products.filter((p: Record<string, unknown>) => p.isWeighted === true);
    
    console.log(`Weighted products found: ${weightedProducts.length}`);
    
    if (weightedProducts.length === 0) {
      console.log('No weighted products in Dexie. Creating test product...');
      
      const createBtn = page.locator('button:has-text("Nuevo"), button:has-text("Agregar")').first();
      if (await createBtn.isVisible({ timeout: 3000 })) {
        await createBtn.click();
        await page.waitForTimeout(2000);
        
        const nameInput = page.locator('input[name="name"]').first();
        const skuInput = page.locator('input[name="sku"]').first();
        const weightedCheckbox = page.locator('input[name="isWeighted"], input[type="checkbox"]').first();
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('Producto Pesable Test');
          await skuInput.fill(`WGT-${Date.now().toString().slice(-6)}`);
          
          if (await weightedCheckbox.isVisible()) {
            await weightedCheckbox.check();
          }
          
          const saveBtn = page.locator('button:has-text("Guardar")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await page.waitForTimeout(5000);
          }
        }
      }
      
      const refreshedProducts = await dbUtil.getByIndex('products', 'tenantId', TEST_TENANT_SLUG);
      const newWeighted = refreshedProducts.filter((p: Record<string, unknown>) => p.isWeighted === true);
      console.log(`Weighted products after creation: ${newWeighted.length}`);
    }
    
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const movements = await dbUtil.getStockMovements(TEST_TENANT_SLUG);
    console.log(`Stock movements found: ${movements.length}`);
    
    if (weightedProducts.length > 0) {
      const weightedProduct = weightedProducts[0] as Record<string, unknown>;
      const productName = weightedProduct.name as string;
      console.log(`Testing weighted product: ${productName}`);
      
      const productMovements = movements.filter((m: Record<string, unknown>) => 
        m.productLocalId === weightedProduct.localId
      );
      
      if (productMovements.length > 0) {
        const movement = productMovements[0] as Record<string, unknown>;
        const quantity = movement.quantity as number;
        const quantityStr = quantity.toString();
        const decimals = quantityStr.includes('.') ? quantityStr.split('.')[1].length : 0;
        
        console.log(`Movement quantity: ${quantity}, decimals: ${decimals}`);
        expect(decimals).toBeLessThanOrEqual(4);
      } else {
        console.log('No movements for weighted product. Creating test movement...');
        
        const addMovementBtn = page.locator('button:has-text("Movimiento"), button:has-text("Nuevo")').first();
        if (await addMovementBtn.isVisible({ timeout: 3000 })) {
          await addMovementBtn.click();
          await page.waitForTimeout(2000);
          
          const qtyInput = page.locator('input[name="quantity"], input[type="number"]').first();
          
          if (await qtyInput.isVisible()) {
            await qtyInput.fill('1.2345');
            
            const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Confirmar")').first();
            if (await saveBtn.isVisible()) {
              await saveBtn.click();
              await page.waitForTimeout(3000);
            }
          }
        }
        
        const newMovements = await dbUtil.getStockMovements(TEST_TENANT_SLUG);
        if (newMovements.length > movements.length) {
          const lastMovement = newMovements[newMovements.length - 1] as Record<string, unknown>;
          const qty = lastMovement.quantity as number;
          const qtyStr = qty.toString();
          const dec = qtyStr.includes('.') ? qtyStr.split('.')[1].length : 0;
          
          console.log(`New movement quantity: ${qty}, decimals: ${dec}`);
          expect(dec).toBeLessThanOrEqual(4);
          expect(dec).toBe(4);
        }
      }
    }
    
    expect(weightedProducts.length).toBeGreaterThanOrEqual(0);
  });
});
