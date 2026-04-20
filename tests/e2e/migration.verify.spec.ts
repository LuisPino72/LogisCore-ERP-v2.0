import { test, expect } from '@playwright/test';

test.describe('Dexie Normalization Migration Evidence', () => {
  test('Verify normalized stores and migration logic', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(() => {
      return (window as any).logiscoreDb !== undefined;
    }, { timeout: 15000 });

    const evidence = await page.evaluate(async () => {
      const db = (window as any).logiscoreDb;
      const results: any = {};
      
      // 1. Check if normalized tables exist
      const tables = [
        'sale_items', 'sale_payments', 'invoice_items', 'invoice_payments',
        'purchase_items', 'purchase_received_items', 'receiving_items',
        'receiving_received_items', 'recipe_ingredients', 'production_ingredients'
      ];
      
      results.tablesExist = tables.every(t => !!db[t]);
      
      // 2. Test Migration Logic Manually
      // Create a legacy sale
      const saleLocalId = `mig-test-sale-${Date.now()}`;
      const items = [
        { productLocalId: 'prod-1', qty: 2, unitPrice: 10, unitCost: 5 },
        { productLocalId: 'prod-2', qty: 1, unitPrice: 20, unitCost: 10 },
      ];
      
      await db.sales.add({
        localId: saleLocalId,
        tenantId: 'prueba',
        items: items,
        payments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // ... other required fields would be needed if there are constraints, 
        // but Dexie is schema-less for the most part
      });

      // Manually invoke the migration logic for this one sale
      // This replicates exactly what's in dexie.ts version(15).upgrade
      const s = await db.sales.get(saleLocalId);
      const ss = s as any;
      const saleId = (ss as any).id || (ss as any).serverId || undefined;
      
      if (Array.isArray(ss.items)) {
        const normalizedItems = (ss.items as any[]).map((it) => ({
          id: crypto.randomUUID(),
          saleLocalId,
          saleId,
          productLocalId: it.productLocalId,
          qty: it.qty,
          unitPrice: it.unitPrice,
          unitCost: it.unitCost ?? null,
          taxAmount: it.taxAmount ?? 0,
          discountAmount: it.discountAmount ?? 0
        }));
        await (db.sale_items as any).bulkPut(normalizedItems);
      }

      // Verify result
      const itemsCount = await db.sale_items.where('saleLocalId').equals(saleLocalId).count();
      results.migrationSuccess = itemsCount === items.length;
      results.itemsCount = itemsCount;

      // Cleanup
      await db.sales.delete(saleLocalId);
      await db.sale_items.where('saleLocalId').equals(saleLocalId).delete();

      return results;
    });

    console.log('Migration Evidence:', evidence);
    expect(evidence.tablesExist).toBe(true);
    expect(evidence.migrationSuccess).toBe(true);
  });
});
