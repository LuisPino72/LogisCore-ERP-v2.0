import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/common";
import { TenantTable } from "./TenantTable";
import { TenantForm } from "./TenantForm";
import type { Tenant, CreateTenantInput, UpdateTenantInput, SecurityUser, Plan, BusinessType } from "../types/admin.types";

interface TenantsListProps {
  tenants: Tenant[];
  businessTypes: BusinessType[];
  plans: Plan[];
  securityUsers: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onUpdate: (id: string, input: UpdateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: { message: string } }>;
  onAccessTenant: (tenant: Tenant) => void;
  onLoadBusinessTypes: () => void;
  onLoadSecurityUsers: () => void;
  onLoadPlans: () => void;
}

export function TenantsList({ 
  tenants, 
  businessTypes,
  plans,
  securityUsers,
  isLoading, 
  onRefresh, 
  onCreate, 
  onUpdate, 
  onDelete,
  onAccessTenant,
  onLoadBusinessTypes,
  onLoadSecurityUsers,
  onLoadPlans
}: TenantsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    onRefresh();
    onLoadBusinessTypes();
    onLoadSecurityUsers();
    onLoadPlans();
  }, [onRefresh, onLoadBusinessTypes, onLoadSecurityUsers, onLoadPlans]);

  const handleSubmit = async (formData: any) => {
    if (editingTenant) {
      await onUpdate(editingTenant.id, formData);
    } else {
      await onCreate(formData);
    }
    setShowForm(false);
    setEditingTenant(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Tenants</h1>
          <p className="text-content-secondary">Gestión de empresas y negocios</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingTenant(null); setShowForm(true); }}
            className="btn btn-primary"
          >
            + Nuevo Tenant
          </button>
        )}
      </div>

      {isLoading && tenants.length === 0 ? (
         <div className="p-8 flex justify-center">
            <LoadingSpinner message="Cargando..." />
         </div>
      ) : (
        <>
          {showForm ? (
             <TenantForm
                initialData={editingTenant}
                businessTypes={businessTypes}
                plans={plans}
                securityUsers={securityUsers}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingTenant(null); }}
             />
          ) : (
             <TenantTable
                tenants={tenants}
                securityUsers={securityUsers}
                onEdit={(t) => { setEditingTenant(t); setShowForm(true); }}
                onDelete={onDelete}
                onAccess={onAccessTenant}
             />
          )}
        </>
      )}
    </div>
  );
}
