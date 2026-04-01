import { CoreSyncStatus } from "@/features/core/components/CoreSyncStatus";
import { coreService } from "@/features/core/services/core.service.instance";
import { InventoryPanel } from "@/features/inventory/components/InventoryPanel";
import { ProductsCatalog } from "@/features/products/components/ProductsCatalog";
import { productsService } from "@/features/products/services/products.service.instance";
import { createProductsPurchasesBridge } from "@/features/products/services/products.purchases-bridge";
import { PurchasesCatalogPanel } from "@/features/purchases/components/PurchasesCatalogPanel";
import { PurchasesPanel } from "@/features/purchases/components/PurchasesPanel";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { SalesPanel } from "@/features/sales/components/SalesPanel";
import { ProductionPanel } from "@/features/production/components/ProductionPanel";
import { InvoicingPanel } from "@/features/invoicing/components/InvoicingPanel";
import { ReportsPanel } from "@/features/reports/components/ReportsPanel";
import type { ReportsActorContext } from "@/features/reports/types/reports.types";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { useEffect, useMemo, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import type { ProductsActorContext } from "@/features/products/types/products.types";
import { useProducts } from "@/features/products/hooks/useProducts";

export function App() {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [actor, setActor] = useState<ProductsActorContext | null>(null);
  const bridge = useMemo(
    () =>
      createProductsPurchasesBridge({
        eventBus,
        productsService
      }),
    []
  );

  const { state: catalogState, refresh: refreshCatalog } = useProducts({
    service: productsService,
    tenant: { tenantSlug: tenantSlug ?? "" },
    actor:
      actor ??
      ({
        role: "employee",
        permissions: {
          canApplyDiscount: false,
          maxDiscountPercent: 0,
          canApplyCustomPrice: false,
          canVoidSale: false,
          canRefundSale: false,
          canVoidInvoice: false,
          canAdjustStock: false,
          canViewReports: true,
          canExportReports: false
        }
      } as ProductsActorContext)
  });

  useEffect(() => {
    const offTenantResolved = eventBus.on<{ tenantSlug: string }>(
      "TENANT.RESOLVED",
      (payload) => {
        setTenantSlug(payload.tenantSlug);
        setBlocked(false);
      }
    );
    const offBlocked = eventBus.on("SUBSCRIPTION.BLOCKED", () => {
      setBlocked(true);
    });
    const offRole = eventBus.on<ProductsActorContext & { userId: string }>(
      "AUTH.ROLE_DETECTED",
      (payload) => {
        setActor({
          role: payload.role,
          permissions: payload.permissions
        });
      }
    );
    return () => {
      offTenantResolved();
      offBlocked();
      offRole();
    };
  }, []);

  useEffect(() => {
    const stopBridge = bridge.start();
    return () => {
      stopBridge();
    };
  }, [bridge]);

  useEffect(() => {
    bridge.setContext({
      tenant: tenantSlug ? { tenantSlug } : null,
      actor
    });
  }, [actor, bridge, tenantSlug]);

  useEffect(() => {
    if (!tenantSlug || !actor) {
      return;
    }
    void refreshCatalog();

    const offCreatedCategory = eventBus.on("CATALOG.CATEGORY_CREATED", () => {
      void refreshCatalog();
    });
    const offCreatedProduct = eventBus.on("CATALOG.PRODUCT_CREATED", () => {
      void refreshCatalog();
    });
    const offCreatedPresentation = eventBus.on(
      "CATALOG.PRESENTATION_CREATED",
      () => {
        void refreshCatalog();
      }
    );
    const offDeletedCategory = eventBus.on("CATALOG.CATEGORY_DELETED", () => {
      void refreshCatalog();
    });
    const offDeletedProduct = eventBus.on("CATALOG.PRODUCT_DELETED", () => {
      void refreshCatalog();
    });

    return () => {
      offCreatedCategory();
      offCreatedProduct();
      offCreatedPresentation();
      offDeletedCategory();
      offDeletedProduct();
    };
  }, [actor, refreshCatalog, tenantSlug]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
      <h1>LogisCore ERP</h1>
      <TenantBootstrapGate
        authService={authService}
        tenantService={tenantService}
        coreService={coreService}
      />
      {!blocked && tenantSlug && actor ? (
        <>
          <PurchasesCatalogPanel
            tenantSlug={tenantSlug}
            actor={actor}
            categories={catalogState.categories}
            products={catalogState.products}
            presentations={catalogState.presentations}
          />
          <PurchasesPanel
            tenantSlug={tenantSlug}
            actor={actor}
            products={catalogState.products}
          />
          <ProductsCatalog tenantSlug={tenantSlug} actor={actor} />
          <InventoryPanel
            tenantSlug={tenantSlug}
            actor={actor}
            products={catalogState.products}
          />
          <SalesPanel
            tenantSlug={tenantSlug}
            actor={actor}
            products={catalogState.products}
          />
          <ProductionPanel
            tenantSlug={tenantSlug}
            actor={actor}
            products={catalogState.products}
          />
          <InvoicingPanel tenantSlug={tenantSlug} actor={actor} />
          <ReportsPanel
            tenantSlug={tenantSlug}
            actor={actor as unknown as ReportsActorContext}
          />
        </>
      ) : null}
      <CoreSyncStatus />
    </main>
  );
}
