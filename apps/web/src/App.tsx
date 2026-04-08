import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { coreService } from "@/features/core/services/core.service.instance";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { exchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service.instance";
import { productsService } from "@/features/products/services/products.service.instance";
import { inventoryService } from "@/features/inventory/services/inventory.service.instance";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";
import { ActorContext } from "@/lib/permissions/permissions.types";
import { eventBus } from "@/lib/core/runtime";
import type { Category, Product, ProductPresentation } from "@/features/products/types/products.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";

const InventoryPanel = lazy(() => import("@/features/inventory/components/InventoryPanel").then(m => ({ default: m.InventoryPanel })));
const DashboardPanel = lazy(() => import("@/features/dashboard").then(m => ({ default: m.DashboardPanel })));
const ProductsCatalog = lazy(() => import("@/features/products/components/ProductsCatalog").then(m => ({ default: m.ProductsCatalog })));
const PurchasesCatalogPanel = lazy(() => import("@/features/purchases/components/PurchasesCatalogPanel").then(m => ({ default: m.PurchasesCatalogPanel })));
const PurchasesPanel = lazy(() => import("@/features/purchases/components/PurchasesPanel").then(m => ({ default: m.PurchasesPanel })));
const SalesPanel = lazy(() => import("@/features/sales/components/SalesPanel").then(m => ({ default: m.SalesPanel })));
const ProductionPanel = lazy(() => import("@/features/production/components/ProductionPanel").then(m => ({ default: m.ProductionPanel })));
const InvoicingPanel = lazy(() => import("@/features/invoicing/components/InvoicingPanel").then(m => ({ default: m.InvoicingPanel })));
const ReportsPanel = lazy(() => import("@/features/reports/components/ReportsPanel").then(m => ({ default: m.ReportsPanel })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
    </div>
  );
}

interface SharedOperationalData {
  products: Product[];
  categories: Category[];
  presentations: ProductPresentation[];
  warehouses: Warehouse[];
  isLoading: boolean;
  lastError: string | null;
  exchangeRate: number;
}

function DashboardHome({ 
  tenantSlug, 
  actor, 
  onNavigate, 
  onUpdateExchangeRate,
  onFetchExchangeRates
}: { 
  tenantSlug: string, 
  actor: ActorContext,
  onNavigate: (module: ModuleId) => void,
  onUpdateExchangeRate: (rate: number) => Promise<void>,
  onFetchExchangeRates: () => Promise<void>
}) {
  const tenantContext = { tenantSlug };
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardPanel 
        tenant={tenantContext as never} 
        actor={actor} 
        onNavigate={onNavigate}
        onUpdateExchangeRate={onUpdateExchangeRate}
        onFetchExchangeRates={onFetchExchangeRates}
      />
    </Suspense>
  );
}

function ModuleRenderer({ 
  moduleId, 
  tenantSlug, 
  actor,
  onNavigate,
  onUpdateExchangeRate,
  onFetchExchangeRates
}: { 
  moduleId: ModuleId, 
  tenantSlug: string, 
  actor: ActorContext,
  onNavigate: (module: ModuleId) => void,
  onUpdateExchangeRate: (rate: number) => Promise<void>,
  onFetchExchangeRates: () => Promise<void>
}) {
  const [sharedData, setSharedData] = useState<SharedOperationalData>({
    products: [],
    categories: [],
    presentations: [],
    warehouses: [],
    isLoading: true,
    lastError: null,
    exchangeRate: 1
  });

  const loadExchangeRate = useCallback(async () => {
    const rateResult = await exchangeRatesService.getActiveRate(tenantSlug, "USD", "VES");
    if (rateResult.ok && rateResult.data) {
      setSharedData((previous) => ({ ...previous, exchangeRate: rateResult.data!.rate }));
      return;
    }
    setSharedData((previous) => ({ ...previous, exchangeRate: 1 }));
  }, [tenantSlug]);

  const refreshExchangeRate = useCallback(async () => {
    await exchangeRatesService.fetchAndSaveRates();
    await loadExchangeRate();
  }, [loadExchangeRate]);

  useEffect(() => {
    let cancelled = false;

    const loadSharedData = async () => {
      setSharedData((previous) => ({ ...previous, isLoading: true, lastError: null }));

      const [productsResult, categoriesResult, presentationsResult, warehousesResult] =
        await Promise.all([
          productsService.listProducts({ tenantSlug }),
          productsService.listCategories({ tenantSlug }),
          productsService.listPresentations({ tenantSlug }),
          inventoryService.listWarehouses({ tenantSlug })
        ]);

      if (cancelled) {
        return;
      }

      const nextError = [
        productsResult.ok ? null : productsResult.error.message,
        categoriesResult.ok ? null : categoriesResult.error.message,
        presentationsResult.ok ? null : presentationsResult.error.message,
        warehousesResult.ok ? null : warehousesResult.error.message
      ].find(Boolean) ?? null;

      setSharedData({
        products: productsResult.ok ? productsResult.data : [],
        categories: categoriesResult.ok ? categoriesResult.data : [],
        presentations: presentationsResult.ok ? presentationsResult.data : [],
        warehouses: warehousesResult.ok ? warehousesResult.data : [],
        isLoading: false,
        lastError: nextError
      });
    };

    void loadSharedData();
    void loadExchangeRate();

    const offCategoryCreated = eventBus.on("CATALOG.CATEGORY_CREATED", () => void loadSharedData());
    const offProductCreated = eventBus.on("CATALOG.PRODUCT_CREATED", () => void loadSharedData());
    const offPresentationCreated = eventBus.on("CATALOG.PRESENTATION_CREATED", () => void loadSharedData());
    const offWarehouseCreated = eventBus.on("INVENTORY.WAREHOUSE_CREATED", () => void loadSharedData());
    const offExchangeRateUpdated = eventBus.on("EXCHANGE_RATE.UPDATED", () => void loadExchangeRate());

    return () => {
      cancelled = true;
      offCategoryCreated();
      offProductCreated();
      offPresentationCreated();
      offWarehouseCreated();
      offExchangeRateUpdated();
    };
  }, [tenantSlug, loadExchangeRate]);

  const renderModule = (id: ModuleId) => {
    switch (id) {
      case "dashboard":
        return <DashboardHome tenantSlug={tenantSlug} actor={actor} onNavigate={onNavigate} onUpdateExchangeRate={onUpdateExchangeRate} onFetchExchangeRates={onFetchExchangeRates} />;
      case "inventory":
        return <InventoryPanel tenantSlug={tenantSlug} actor={actor as never} products={sharedData.products} />;
      case "products":
        return (
          <ProductsCatalog
            tenantSlug={tenantSlug}
            actor={actor as never}
            exchangeRate={sharedData.exchangeRate}
          />
        );
      case "purchases":
        return (
          <>
            <PurchasesCatalogPanel
              tenantSlug={tenantSlug}
              actor={actor as never}
              categories={sharedData.categories}
              products={sharedData.products}
              presentations={sharedData.presentations}
            />
            <PurchasesPanel
              tenantSlug={tenantSlug}
              actor={actor as never}
              products={sharedData.products}
              categories={sharedData.categories}
              presentations={sharedData.presentations}
              warehouses={sharedData.warehouses}
            />
          </>
        );
      case "sales":
        return (
          <SalesPanel
            tenantSlug={tenantSlug}
            actor={actor as never}
            products={sharedData.products}
            exchangeRate={sharedData.exchangeRate}
            onRefreshExchangeRate={refreshExchangeRate}
          />
        );
      case "production":
        return <ProductionPanel tenantSlug={tenantSlug} actor={actor as never} products={sharedData.products} warehouses={sharedData.warehouses} />;
      case "invoicing":
        return <InvoicingPanel tenantSlug={tenantSlug} actor={actor as never} />;
      case "reports":
        return <ReportsPanel tenantSlug={tenantSlug} actor={actor as never} />;
      default:
        return <DashboardHome tenantSlug={tenantSlug} actor={actor} onNavigate={onNavigate} onUpdateExchangeRate={onUpdateExchangeRate} onFetchExchangeRates={onFetchExchangeRates} />;
    }
  };

  const requiresOperationalData = moduleId === "inventory" || moduleId === "purchases" || moduleId === "sales" || moduleId === "production";

  if (requiresOperationalData && sharedData.isLoading && sharedData.products.length === 0) {
    return <LoadingFallback />;
  }

  if (requiresOperationalData && sharedData.lastError && sharedData.products.length === 0) {
    return (
      <div className="p-6">
        <div className="alert alert-error">
          Error cargando datos operativos: {sharedData.lastError}
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {renderModule(moduleId)}
    </Suspense>
  );
}

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const handleUpdateExchangeRate = async (rate: number) => {
    await exchangeRatesService.setManualRate("system", rate, "USD", "VES");
    eventBus.emit("DASHBOARD.REFRESH", undefined);
  };

  const handleFetchExchangeRates = async () => {
    await exchangeRatesService.fetchAndSaveRates();
    eventBus.emit("DASHBOARD.REFRESH", undefined);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isRecovery = params.get("resetPassword") === "true" || 
                       params.get("type") === "recovery" || 
                       params.get("access_token") !== null ||
                       hash.includes("type=recovery") || 
                       hash.includes("access_token");
    if (isRecovery) {
      console.log("Password reset detected", Object.fromEntries(params));
      setIsPasswordReset(true);
    }
  }, []);

  if (isPasswordReset) {
    return (
      <ResetPasswordPage
        onUpdatePassword={(password) => authService.updatePassword(password)}
        onPasswordReset={() => {
          window.location.hash = "";
          window.location.search = "";
          setIsPasswordReset(false);
        }}
      />
    );
  }

  return (
    <TenantBootstrapGate
      authService={authService}
      tenantService={tenantService}
      coreService={coreService}
      renderApp={(tenantSlug, actor, signOut) => (
        <AppLayout activeModule={activeModule} onModuleChange={setActiveModule} onLogout={signOut}>
          <ModuleRenderer 
            moduleId={activeModule} 
            tenantSlug={tenantSlug} 
            actor={actor}
            onNavigate={setActiveModule}
            onUpdateExchangeRate={handleUpdateExchangeRate}
            onFetchExchangeRates={handleFetchExchangeRates}
          />
        </AppLayout>
      )}
    />
  );
}
