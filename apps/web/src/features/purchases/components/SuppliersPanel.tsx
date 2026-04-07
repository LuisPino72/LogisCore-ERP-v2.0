/**
 * Componente de gestión de proveedores.
 * CRUD de proveedores vinculado al módulo de compras.
 * 
 * Features:
 * - Dashboard con tabla de proveedores
 * - Creación/Edición vía Modal
 * - Búsqueda por nombre
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, Check, Building2 } from "lucide-react";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import { Modal } from "@/common/components/Modal";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Badge } from "@/common/components/Badge";
import type { PurchasesActorContext, Supplier, CreateSupplierInput, UpdateSupplierInput } from "../types/purchases.types";

interface SuppliersPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
}

interface SupplierFormData {
  name: string;
  rif: string;
  phone: string;
  contactPerson: string;
  notes: string;
}

const initialForm: SupplierFormData = {
  name: "",
  rif: "",
  phone: "",
  contactPerson: "",
  notes: ""
};

export function SuppliersPanel({ tenantSlug, actor }: SuppliersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(initialForm);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { state, refresh, createSupplier, updateSupplier } = usePurchases({
    service: purchasesService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASES.SUPPLIER_CREATED", () => {
      void refresh();
      setLastError(null);
    });
    const offUpdated = eventBus.on("PURCHASES.SUPPLIER_UPDATED", () => {
      void refresh();
      setLastError(null);
    });
    const offFailed = eventBus.on("PURCHASES.SUPPLIER_FAILED", ({ error }: { error: string }) => {
      setLastError(error);
    });
    return () => {
      offCreated();
      offUpdated();
      offFailed();
    };
  }, [refresh]);

  const filteredSuppliers = useMemo(() => {
    return state.suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [state.suppliers, searchQuery]);

  const handleOpenCreate = useCallback(() => {
    setForm(initialForm);
    setEditingSupplier(null);
    setFormError(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((supplier: Supplier) => {
    setForm({
      name: supplier.name,
      rif: supplier.rif ?? "",
      phone: supplier.phone ?? "",
      contactPerson: supplier.contactPerson ?? "",
      notes: supplier.notes ?? ""
    });
    setEditingSupplier(supplier);
    setFormError(null);
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setFormError("El nombre es requerido");
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    setLastError(null);
    
    const input: CreateSupplierInput | UpdateSupplierInput = editingSupplier
      ? { localId: editingSupplier.localId, ...form }
      : form;
    
    const result = editingSupplier
      ? await updateSupplier(input as UpdateSupplierInput)
      : await createSupplier(input as CreateSupplierInput);

    if (result) {
      setShowModal(false);
      setForm(initialForm);
      setEditingSupplier(null);
    } else if (state.lastError) {
      setFormError(state.lastError.message);
    }
    
    setIsSubmitting(false);
  }, [form, editingSupplier, updateSupplier, createSupplier, state.lastError]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setForm(initialForm);
    setEditingSupplier(null);
    setFormError(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="card-title">Gestión de Proveedores</h2>
          <p className="text-sm text-content-secondary mt-1">
            Administra tus proveedores y sus datos de contacto
          </p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar proveedores..."
            className="input pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleOpenCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {lastError && <div className="alert alert-error">{lastError}</div>}

      {/* Suppliers Table */}
      <div className="card">
        <div className="card-body">
          {state.isLoading ? (
            <LoadingSpinner message="Cargando proveedores..." />
          ) : filteredSuppliers.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-12 h-12" />}
              title="No hay proveedores"
              description="Crea tu primer proveedor para comenzar"
              action={
                <button onClick={handleOpenCreate} className="btn btn-primary">
                  <Plus className="w-4 h-4" /> Nuevo Proveedor
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-100 border-b border-surface-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-content-secondary">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-content-secondary">RIF</th>
                    <th className="px-3 py-2 text-left font-medium text-content-secondary">Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium text-content-secondary">Contacto</th>
                    <th className="px-3 py-2 text-left font-medium text-content-secondary">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr 
                      key={supplier.localId} 
                      className="hover:bg-surface-50 cursor-pointer"
                      onClick={() => handleOpenEdit(supplier)}
                    >
                      <td className="px-3 py-2 text-content-primary font-medium">{supplier.name}</td>
                      <td className="px-3 py-2 text-content-secondary font-mono text-xs">{supplier.rif || "-"}</td>
                      <td className="px-3 py-2 text-content-secondary">{supplier.phone || "-"}</td>
                      <td className="px-3 py-2 text-content-secondary">{supplier.contactPerson || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={supplier.isActive ? "success" : "default"}>
                          {supplier.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleClose}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        size="lg"
        footer={
          <>
            <button onClick={handleClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> {editingSupplier ? "Guardar" : "Crear"}</>}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset>
            <legend className="label mb-3">Información Básica</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">RIF</label>
                <input
                  type="text"
                  value={form.rif}
                  onChange={(e) => setForm({ ...form, rif: e.target.value.toUpperCase() })}
                  placeholder="J-12345678-9"
                  className="input font-mono"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Contacto</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0412-1234567"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Persona de contacto</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Nombre del contacto"
                  className="input"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Notas</legend>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales sobre el proveedor..."
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </fieldset>

          {formError && <div className="alert alert-error">{formError}</div>}
        </div>
      </Modal>
    </div>
  );
}