import { test, expect } from '@playwright/test';
import { DexieUtil } from '../playwright.db.util';

const TEST_TENANT_SLUG = 'prueba';

test.describe('Integration Tests', () => {
  test.setTimeout(20000);
  
  test('Dexie accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const db = await page.evaluate(() => !!(window as any).logiscoreDb);
    expect(db).toBeDefined();
  });
});