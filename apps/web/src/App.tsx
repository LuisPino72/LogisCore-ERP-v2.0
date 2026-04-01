import { CoreSyncStatus } from "@/features/core/components/CoreSyncStatus";
import { coreService } from "@/features/core/services/core.service.instance";
import { ProductsCatalog } from "@/features/products/components/ProductsCatalog";
import { productsService } from "@/features/products/services/products.service.instance";
import { createProductsPurchasesBridge } from "@/features/products/services/products.purchases-bridge";
import { PurchasesCatalogPanel } from "@/features/purchases/components/PurchasesCatalogPanel";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
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
          canAdjustStock: false
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
            categories={catalogState.categories}
            products={catalogState.products}
            presentations={catalogState.presentations}
          />
          <ProductsCatalog tenantSlug={tenantSlug} actor={actor} />
        </>
      ) : null}
      <CoreSyncStatus />
    </main>
  );
}
