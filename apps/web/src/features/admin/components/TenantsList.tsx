import { useEffect, useState, useMemo, useRef } from "react";
import { LoadingSpinner, toastHelpers, ConfirmDialog } from "@/common";
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
  onDeactivate: (id: string) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onDelete: (id: string, permanent?: boolean) => Promise<{ ok: boolean; error?: { message: string } }>;
  onAccessTenant: (tenant: Tenant) => void;
  onLoadBusinessTypes: () => void;
  onLoadSecurityUsers: () => void;
  onLoadPlans: () => void;
}

export function TenantsList({ 
  tenants, 
  businessTypes,
  plans = [],
  securityUsers,
  isLoading, 
  onRefresh, 
  onCreate, 
  onUpdate, 
  onDeactivate,
  onDelete,
  onAccessTenant,
  onLoadBusinessTypes,
  onLoadSecurityUsers,
  onLoadPlans
}: TenantsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; tenant: Tenant | null; permanent: boolean }>({
    isOpen: false,
    tenant: null,
    permanent: false
  });
  const [isDeleting, setIsDeleting] = useState(false);
  
  const initialLoadDone = useRef(false);

  const tenantEmployees = useMemo(() => {
    if (!editingTenant) return [];
    return securityUsers.filter(u => u.tenantId === editingTenant.id && u.role === "employee");
  }, [editingTenant, securityUsers]);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    
    onRefresh();
    onLoadBusinessTypes();
    onLoadSecurityUsers();
    onLoadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showForm && editingTenant && securityUsers.length === 0) {
      onLoadSecurityUsers();
    }
  }, [showForm, editingTenant, securityUsers, onLoadSecurityUsers]);

  const handleSubmit = async (formData: unknown) => {
    if (editingTenant) {
      const result = await onUpdate(editingTenant.id, formData as UpdateTenantInput);
      if (result.ok) {
        toastHelpers.success("Tenant actualizado exitosamente");
        setShowForm(false);
        setEditingTenant(null);
      } else {
        toastHelpers.error(result.error?.message || "Error al actualizar el tenant");
      }
    } else {
      const result = await onCreate(formData as CreateTenantInput);
      if (result.ok) {
        toastHelpers.success("Tenant creado exitosamente");
        setShowForm(false);
        setEditingTenant(null);
      } else {
        toastHelpers.error(result.error?.message || "Error al crear el tenant");
      }
    }
  };

  const handleDeleteClick = (tenant: Tenant, permanent: boolean = false) => {
    setDeleteConfirm({ isOpen: true, tenant, permanent });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.tenant) return;
    
    setIsDeleting(true);
    try {
      const result = await onDelete(deleteConfirm.tenant.id, deleteConfirm.permanent);
      if (result.ok) {
        toastHelpers.success("Tenant eliminado exitosamente");
      } else {
        toastHelpers.error(result.error?.message || "Error al eliminar el tenant");
      }
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false, tenant: null, permanent: false });
    }
  };

  const handleDeactivate = async (tenant: Tenant) => {
    const result = await onDeactivate(tenant.id);
    if (result.ok) {
      toastHelpers.success(`Tenant "${tenant.name}" ha sido desactivado`);
    } else {
      toastHelpers.error(result.error?.message || "Error al desactivar el tenant");
    }
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
                tenantEmployees={tenantEmployees}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingTenant(null); }}
              />
            ) : (
               <TenantTable
                   tenants={tenants}
                   securityUsers={securityUsers}
                   onEdit={async (t) => { 
                     if (securityUsers.length === 0) {
                       await onLoadSecurityUsers();
                     }
                     setEditingTenant(t); 
                     setShowForm(true); 
                   }}
                   onDelete={(id, permanent = false) => {
                    const tenant = tenants.find(t => t.id === id);
                    if (tenant) handleDeleteClick(tenant, permanent);
                  }}
                  onDeactivate={(tenant) => handleDeactivate(tenant)}
                  onAccess={onAccessTenant}
               />
            )}
        </>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, tenant: null, permanent: false })}
        onConfirm={handleConfirmDelete}
        title={deleteConfirm.permanent ? "Eliminar Permanentemente" : "Desactivar Tenant"}
        message={deleteConfirm.permanent 
          ? `¿Estás seguro de que deseas eliminar PERMANENTEMENTE el tenant "${deleteConfirm.tenant?.name}"? Se eliminarán todos los datos asociados: usuarios, suscripciones y toda la información. Esta acción NO se puede deshacer.`
          : `¿Estás seguro de que deseas desactivar el tenant "${deleteConfirm.tenant?.name}"? El tenant queda inactivo y no podrá acceder al sistema.`}
        confirmLabel={deleteConfirm.permanent ? "Eliminar Permanentemente" : "Desactivar"}
        cancelLabel="Cancelar"
        variant={deleteConfirm.permanent ? "danger" : "primary"}
        isLoading={isDeleting}
      />
    </div>
  );
}