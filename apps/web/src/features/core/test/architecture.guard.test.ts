import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("architecture guard", () => {
  it("hooks y componentes no importan lib/db o lib/supabase", () => {
    const featureRoot = path.resolve(
      process.cwd(),
      "apps/web/src/features/core"
    );
    const files = [
      path.join(featureRoot, "hooks/useCore.ts"),
      path.join(featureRoot, "components/CoreBootstrapGate.tsx"),
      path.join(featureRoot, "components/CoreSyncStatus.tsx"),
      path.join(featureRoot, "components/BlockedAccessScreen.tsx"),
      path.resolve(process.cwd(), "apps/web/src/features/auth/hooks/useAuth.ts"),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/tenant/hooks/useTenantData.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/tenant/components/TenantBootstrapGate.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/products/hooks/useProducts.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/products/components/ProductsCatalog.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/purchases/hooks/usePurchases.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/purchases/components/PurchasesCatalogPanel.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/purchases/components/PurchasesPanel.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/inventory/hooks/useInventory.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/inventory/components/InventoryForm.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/inventory/components/InventoryList.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/inventory/components/InventoryPanel.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/sales/hooks/useSales.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/sales/components/SalesPanel.tsx"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/production/hooks/useProduction.ts"
      ),
      path.resolve(
        process.cwd(),
        "apps/web/src/features/production/components/ProductionPanel.tsx"
      )
    ];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");
      expect(content).not.toContain("lib/db");
      expect(content).not.toContain("lib/supabase");
    }
  });
});
