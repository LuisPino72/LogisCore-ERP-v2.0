import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("app wiring guard", () => {
  it("no inyecta listas vacias en modulos operativos", () => {
    const appPath = path.resolve(process.cwd(), "apps/web/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf8");

    expect(content).not.toContain("InventoryPanel tenantSlug={tenantSlug} actor={actor as never} products={[]}");
    expect(content).not.toContain("PurchasesCatalogPanel tenantSlug={tenantSlug} actor={actor as never} categories={[]} products={[]} presentations={[]}");
    expect(content).not.toContain("PurchasesPanel tenantSlug={tenantSlug} actor={actor as never} products={[]} warehouses={[]}");
    expect(content).not.toContain("SalesPanel tenantSlug={tenantSlug} actor={actor as never} products={[]}");
    expect(content).not.toContain("ProductionPanel tenantSlug={tenantSlug} actor={actor as never} products={[]}");
  });
});
