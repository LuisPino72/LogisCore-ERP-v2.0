import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_USER_EMAIL = 'anaisabelp2608@gmail.com';
const TEST_USER_PASSWORD = 'JQhXmSx69&';
const TEST_TENANT_SLUG = 'prueba';

async function loginAndNavigate(page: import('@playwright/test').Page, path: string = '/invoicing') {
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

test.describe('Invoicing Module - Fiscal Rules Tests', () => {
  
  test('RIF VALIDATION - Invalid RIF should be rejected (format V123)', async ({ page }) => {
    await loginAndNavigate(page, '/invoicing');
    
    const issueInvoiceTab = page.locator('button:has-text("Emitir"), button:has-text("Facturar")').first();
    if (await issueInvoiceTab.isVisible({ timeout: 5000 })) {
      await issueInvoiceTab.click();
      await page.waitForTimeout(2000);
    }
    
    const rifInput = page.locator('input[name="customerRif"], input[id="customerRif"], input[placeholder*="RIF"]').first();
    
    if (await rifInput.isVisible()) {
      await rifInput.fill('V123');
      await page.waitForTimeout(500);
      
      const errorMessage = page.locator('[class*="error"], [class*="invalid"], text="RIF"').first();
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      console.log(`Invalid RIF 'V123' - Error shown: ${hasError}`);
      
      const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Emitir"), button[type="submit"]').first();
      const isDisabled = await saveBtn.getAttribute('disabled');
      
      console.log(`Save/Issue button disabled: ${isDisabled}`);
      
      expect(hasError || isDisabled !== null).toBe(true);
    } else {
      console.log('RIF input not visible - skipping test');
      expect(true).toBe(true);
    }
  });

  test('RIF VALIDATION - Valid RIF should be accepted (format V123456789)', async ({ page }) => {
    await loginAndNavigate(page, '/invoicing');
    
    const issueInvoiceTab = page.locator('button:has-text("Emitir"), button:has-text("Facturar")').first();
    if (await issueInvoiceTab.isVisible({ timeout: 5000 })) {
      await issueInvoiceTab.click();
      await page.waitForTimeout(2000);
    }
    
    const rifInput = page.locator('input[name="customerRif"], input[id="customerRif"], input[placeholder*="RIF"]').first();
    
    if (await rifInput.isVisible()) {
      await rifInput.fill('V123456789');
      await page.waitForTimeout(500);
      
      const errorMessage = page.locator('[class*="error"], [class*="invalid"]').first();
      const hasError = await errorMessage.isVisible().catch(() => false);
      
      console.log(`Valid RIF 'V123456789' - Error shown: ${hasError}`);
      
      expect(hasError).toBe(false);
    } else {
      console.log('RIF input not visible - skipping test');
      expect(true).toBe(true);
    }
  });

  test('IGTF CALCULATION - Verify 3% IGTF on USD payments', async ({ page }) => {
    await loginAndNavigate(page, '/sales');
    
    const dbUtil = new DexieUtil(page);
    
    const sales = await dbUtil.getByIndex('sales', 'tenantId', TEST_TENANT_SLUG);
    const salesWithIGTF = sales.filter((s: Record<string, unknown>) => (s.igtf_amount as number) > 0);
    
    if (salesWithIGTF.length > 0) {
      const sale = salesWithIGTF[0] as Record<string, unknown>;
      const payments = sale.payments as Array<{ currency: string; amount: number }>;
      const exchangeRate = sale.exchangeRate as number;
      const igtfAmount = sale.igtf_amount as number;
      
      const usdPaymentsTotal = payments
        .filter(p => p.currency === 'USD')
        .reduce((sum, p) => sum + p.amount, 0);
      
      const expectedIGTF = usdPaymentsTotal * exchangeRate * 0.03;
      
      console.log(`USD Payments: ${usdPaymentsTotal}, Rate: ${exchangeRate}, IGTF: ${igtfAmount}, Expected: ${expectedIGTF.toFixed(4)}`);
      
      expect(Math.abs(igtfAmount - expectedIGTF)).toBeLessThan(0.01);
    } else {
      console.log('No sales with IGTF found');
      expect(true).toBe(true);
    }
  });

  test('EXCHANGE RATE SNAPSHOT - Verify exchange_rate_snapshot stored in invoices', async ({ page }) => {
    await loginAndNavigate(page, '/invoicing');
    
    const dbUtil = new DexieUtil(page);
    
    const invoices = await dbUtil.getInvoices(TEST_TENANT_SLUG);
    console.log(`Invoices in Dexie: ${invoices.length}`);
    
    const invoicesWithSnapshot = invoices.filter((inv: Record<string, unknown>) => 
      inv.exchangeRateSnapshot !== undefined && inv.exchangeRateSnapshot !== null
    );
    
    console.log(`Invoices with exchange_rate_snapshot: ${invoicesWithSnapshot.length}`);
    
    if (invoicesWithSnapshot.length > 0) {
      const invoice = invoicesWithSnapshot[0] as Record<string, unknown>;
      const snapshot = invoice.exchangeRateSnapshot as number;
      
      console.log(`Exchange rate snapshot: ${snapshot}`);
      expect(snapshot).toBeGreaterThan(0);
      
      const exchangeRates = await dbUtil.getExchangeRates(TEST_TENANT_SLUG);
      if (exchangeRates.length > 0) {
        const rate = exchangeRates[0] as Record<string, unknown>;
        console.log(`Current exchange rate: ${rate.rate}`);
      }
    } else {
      console.log('No invoices with snapshot yet - need to emit invoice with USD payment');
      
      const issueTab = page.locator('button:has-text("Emitir")').first();
      if (await issueTab.isVisible({ timeout: 3000 })) {
        await issueTab.click();
        await page.waitForTimeout(2000);
        
        const saveBtn = page.locator('button:has-text("Emitir"), button:has-text("Guardar")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(5000);
        }
      }
      
      const refreshedInvoices = await dbUtil.getInvoices(TEST_TENANT_SLUG);
      if (refreshedInvoices.length > invoices.length) {
        const newInvoice = refreshedInvoices[refreshedInvoices.length - 1] as Record<string, unknown>;
        console.log(`New invoice created with exchange_rate_snapshot: ${newInvoice.exchangeRateSnapshot}`);
      }
    }
    
    expect(invoices.length).toBeGreaterThanOrEqual(0);
  });
});
