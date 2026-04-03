import { useState, useEffect, lazy, Suspense } from "react";
import { coreService } from "@/features/core/services/core.service.instance";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";
import { supabase } from "@/lib/supabase/client";

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

function DashboardHome() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-content-primary mb-2">Bienvenido a LogisCore ERP</h1>
      <p className="text-content-secondary">Selecciona un módulo del menú para comenzar.</p>
    </div>
  );
}

function ModuleRenderer({ moduleId }: { moduleId: ModuleId }) {
  const defaultActor = { 
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
  };

  const renderModule = (id: ModuleId) => {
    switch (id) {
      case "dashboard":
        return <DashboardHome />;
      case "inventory":
        return <InventoryPanel tenantSlug="" actor={defaultActor as never} products={[]} />;
      case "products":
        return <ProductsCatalog tenantSlug="" actor={defaultActor as never} />;
      case "purchases":
        return (
          <>
            <PurchasesCatalogPanel tenantSlug="" actor={defaultActor as never} categories={[]} products={[]} presentations={[]} />
            <PurchasesPanel tenantSlug="" actor={defaultActor as never} products={[]} />
          </>
        );
      case "sales":
        return <SalesPanel tenantSlug="" actor={defaultActor as never} products={[]} />;
      case "production":
        return <ProductionPanel tenantSlug="" actor={defaultActor as never} products={[]} />;
      case "invoicing":
        return <InvoicingPanel tenantSlug="" actor={defaultActor as never} />;
      case "reports":
        return <ReportsPanel tenantSlug="" actor={defaultActor as never} />;
      default:
        return <DashboardHome />;
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
        supabase={supabase as never}
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
      renderApp={() => (
        <AppLayout activeModule={activeModule} onModuleChange={setActiveModule}>
          <ModuleRenderer moduleId={activeModule} />
        </AppLayout>
      )}
    />
  );
}
