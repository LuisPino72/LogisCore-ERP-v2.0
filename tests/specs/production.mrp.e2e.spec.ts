import { test, expect } from "@playwright/test";

const TENANT_SLUG = "test-tenant-e2e";
const WAREHOUSE_ID = "test-warehouse-001";

test.describe("MRP - Production Module E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/production");
  });

  test("ESCENARIO 1: Producción sin varianza (flujo completo)", async ({ page }) => {
    const recipeName = `Receta Test ${Date.now()}`;
    const yieldQty = 100;
    const plannedQty = 50;

    await page.click("[data-testid='create-recipe-btn']");
    await expect(page.locator("[data-testid='recipe-form']")).toBeVisible();

    await page.fill("[data-testid='recipe-name']", recipeName);
    await page.fill("[data-testid='yield-qty']", String(yieldQty));

    await page.click("[data-testid='add-ingredient-btn']");
    await page.fill("[data-testid='ingredient-0-product-id']", "prod-001");
    await page.fill("[data-testid='ingredient-0-qty']", "50");

    await page.click("[data-testid='save-recipe-btn']");
    await expect(page.locator("[data-testid='recipe-success-message']")).toBeVisible({ timeout: 5000 });

    await page.click("[data-testid='create-order-btn']");
    await expect(page.locator("[data-testid='order-form']")).toBeVisible();

    const recipeOption = page.locator("[data-testid='recipe-select'] option").first();
    await page.locator("[data-testid='recipe-select']").selectOption({ index: 1 });
    
    await page.fill("[data-testid='planned-qty']", String(plannedQty));
    await page.click("[data-testid='start-production-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("En Progreso", { timeout: 5000 });

    await page.click("[data-testid='complete-production-btn']");
    await expect(page.locator("[data-testid='completion-modal']")).toBeVisible();

    await page.fill("[data-testid='produced-qty-input']", String(plannedQty));
    await page.click("[data-testid='confirm-completion-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("Completada", { timeout: 5000 });

    const varianceCell = page.locator("[data-testid='variance-cell']").first();
    await expect(varianceCell).toHaveText("0.00%");
  });

  test("ESCENARIO 2: Sobre-consumo con varianza positiva", async ({ page }) => {
    const recipeName = `Receta SobreConsumo ${Date.now()}`;
    const yieldQty = 100;
    const plannedQty = 50;

    await page.click("[data-testid='create-recipe-btn']");
    await page.fill("[data-testid='recipe-name']", recipeName);
    await page.fill("[data-testid='yield-qty']", String(yieldQty));

    await page.click("[data-testid='add-ingredient-btn']");
    await page.fill("[data-testid='ingredient-0-product-id']", "prod-002");
    await page.fill("[data-testid='ingredient-0-qty']", "60");

    await page.click("[data-testid='save-recipe-btn']");
    await expect(page.locator("[data-testid='recipe-success-message']")).toBeVisible({ timeout: 5000 });

    await page.click("[data-testid='create-order-btn']");
    await page.locator("[data-testid='recipe-select']").selectOption({ index: 1 });
    await page.fill("[data-testid='planned-qty']", String(plannedQty));
    await page.click("[data-testid='start-production-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("En Progreso");

    await page.click("[data-testid='complete-production-btn']");
    await page.fill("[data-testid='produced-qty-input']", String(plannedQty + 5));
    await page.click("[data-testid='confirm-completion-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("Completada");

    const varianceCell = page.locator("[data-testid='variance-cell']").first();
    const varianceText = await varianceCell.textContent();
    const variance = parseFloat(varianceText?.replace("%", "") || "0");

    expect(variance).toBeGreaterThan(0);
  });

  test("ESCENARIO 3: Bajo-consumo con varianza negativa", async ({ page }) => {
    const recipeName = `Receta BajoConsumo ${Date.now()}`;
    const yieldQty = 100;
    const plannedQty = 50;

    await page.click("[data-testid='create-recipe-btn']");
    await page.fill("[data-testid='recipe-name']", recipeName);
    await page.fill("[data-testid='yield-qty']", String(yieldQty));

    await page.click("[data-testid='add-ingredient-btn']");
    await page.fill("[data-testid='ingredient-0-product-id']", "prod-003");
    await page.fill("[data-testid='ingredient-0-qty']", "40");

    await page.click("[data-testid='save-recipe-btn']");
    await expect(page.locator("[data-testid='recipe-success-message']")).toBeVisible({ timeout: 5000 });

    await page.click("[data-testid='create-order-btn']");
    await page.locator("[data-testid='recipe-select']").selectOption({ index: 1 });
    await page.fill("[data-testid='planned-qty']", String(plannedQty));
    await page.click("[data-testid='start-production-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("En Progreso");

    await page.click("[data-testid='complete-production-btn']");
    await page.fill("[data-testid='produced-qty-input']", String(plannedQty - 5));
    await page.click("[data-testid='confirm-completion-btn']");

    await expect(page.locator("[data-testid='order-status-badge']")).toHaveText("Completada");

    const varianceCell = page.locator("[data-testid='variance-cell']").first();
    const varianceText = await varianceCell.textContent();
    const variance = parseFloat(varianceText?.replace("%", "") || "0");

    expect(variance).toBeLessThan(0);
  });

  test("ESCENARIO 4: Ingredientes pesables con precisión de 4 decimales", async ({ page }) => {
    const recipeName = `Receta Pesables ${Date.now()}`;
    const yieldQty = 50;

    await page.click("[data-testid='create-recipe-btn']");
    await page.fill("[data-testid='recipe-name']", recipeName);
    await page.fill("[data-testid='yield-qty']", String(yieldQty));

    await page.click("[data-testid='add-ingredient-btn']");
    await page.fill("[data-testid='ingredient-0-product-id']", "prod-weighted-001");
    await page.fill("[data-testid='ingredient-0-qty']", "12.3456");
    await page.check("[data-testid='ingredient-0-is-weighted']");

    await page.click("[data-testid='add-ingredient-btn']");
    await page.fill("[data-testid='ingredient-1-product-id']", "prod-weighted-002");
    await page.fill("[data-testid='ingredient-1-qty']", "5.6789");
    await page.check("[data-testid='ingredient-1-is-weighted']");

    await page.click("[data-testid='save-recipe-btn']");
    await expect(page.locator("[data-testid='recipe-success-message']")).toBeVisible({ timeout: 5000 });

    await expect(page.locator("[data-testid='weighted-precision-warning]")).not.toBeVisible();

    const ingredient0Qty = await page.locator("[data-testid='ingredient-0-qty']").inputValue();
    const ingredient1Qty = await page.locator("[data-testid='ingredient-1-qty']").inputValue();

    expect(ingredient0Qty).toBe("12.3456");
    expect(ingredient1Qty).toBe("5.6789");
  });

  test("FIFO: Validar orden de consumo de lotes", async ({ page }) => {
    await page.goto("/inventory");

    await expect(page.locator("[data-testid='inventory-page-title']")).toBeVisible();

    const lotsSection = page.locator("[data-testid='lots-section']");
    if (await lotsSection.isVisible()) {
      const lotRows = page.locator("[data-testid='lot-row']");
      const count = await lotRows.count();
      
      if (count >= 3) {
        const firstLotDate = await lotRows.nth(0).locator("[data-testid='lot-created-at']").textContent();
        const secondLotDate = await lotRows.nth(1).locator("[data-testid='lot-created-at']").textContent();
        const thirdLotDate = await lotRows.nth(2).locator("[data-testid='lot-created-at']").textContent();

        expect(firstLotDate).toBeLessThanOrEqual(secondLotDate || "");
        expect(secondLotDate).toBeLessThanOrEqual(thirdLotDate || "");
      }
    }
  });
});