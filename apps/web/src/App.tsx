import { useState, useEffect, lazy, Suspense } from "react";
import { coreService } from "@/features/core/services/core.service.instance";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { exchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service.instance";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";
import { ActorContext } from "@/lib/permissions/permissions.types";
import { DashboardPanel } from "@/features/dashboard";
import { eventBus } from "@/lib/core/runtime";

const InventoryPanel = lazy(() => import("@/features/inventory/components/InventoryPanel").then(m => ({ default: m.InventoryPanel })));
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
    <DashboardPanel 
      tenant={tenantContext as never} 
      actor={actor} 
      onNavigate={onNavigate}
      onUpdateExchangeRate={onUpdateExchangeRate}
      onFetchExchangeRates={onFetchExchangeRates}
    />
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
  const renderModule = (id: ModuleId) => {
    switch (id) {
      case "dashboard":
        return <DashboardHome tenantSlug={tenantSlug} actor={actor} onNavigate={onNavigate} onUpdateExchangeRate={onUpdateExchangeRate} onFetchExchangeRates={onFetchExchangeRates} />;
      case "inventory":
        return <InventoryPanel tenantSlug={tenantSlug} actor={actor as never} products={[]} />;
      case "products":
        return <ProductsCatalog tenantSlug={tenantSlug} actor={actor as never} />;
      case "purchases":
        return (
          <>
            <PurchasesCatalogPanel tenantSlug={tenantSlug} actor={actor as never} categories={[]} products={[]} presentations={[]} />
            <PurchasesPanel tenantSlug={tenantSlug} actor={actor as never} products={[]} warehouses={[]} />
          </>
        );
      case "sales":
        return <SalesPanel tenantSlug={tenantSlug} actor={actor as never} products={[]} />;
      case "production":
        return <ProductionPanel tenantSlug={tenantSlug} actor={actor as never} products={[]} />;
      case "invoicing":
        return <InvoicingPanel tenantSlug={tenantSlug} actor={actor as never} />;
      case "reports":
        return <ReportsPanel tenantSlug={tenantSlug} actor={actor as never} />;
      default:
        return <DashboardHome tenantSlug={tenantSlug} actor={actor} onNavigate={onNavigate} onUpdateExchangeRate={onUpdateExchangeRate} onFetchExchangeRates={onFetchExchangeRates} />;
    }
  };

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
