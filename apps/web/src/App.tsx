import { useState, useEffect } from "react";
import { coreService } from "@/features/core/services/core.service.instance";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ResetPasswordPage } from "@/features/auth/components/ResetPasswordPage";
import { InventoryPanel } from "@/features/inventory/components/InventoryPanel";
import { ProductsCatalog } from "@/features/products/components/ProductsCatalog";
import { PurchasesCatalogPanel } from "@/features/purchases/components/PurchasesCatalogPanel";
import { PurchasesPanel } from "@/features/purchases/components/PurchasesPanel";
import { SalesPanel } from "@/features/sales/components/SalesPanel";
import { ProductionPanel } from "@/features/production/components/ProductionPanel";
import { InvoicingPanel } from "@/features/invoicing/components/InvoicingPanel";
import { ReportsPanel } from "@/features/reports/components/ReportsPanel";
import { supabase } from "@/lib/supabase/client";

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

  switch (moduleId) {
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
}

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hasRecoveryToken = params.get("type") === "recovery" || 
                            params.get("access_token") !== null ||
                            hash.includes("type=recovery") || 
                            hash.includes("access_token");
    if (hasRecoveryToken) {
      setIsPasswordReset(true);
    }
  }, []);

  if (isPasswordReset) {
    return (
      <ResetPasswordPage
        supabase={supabase as never}
        onPasswordReset={() => {
          window.location.hash = "";
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
