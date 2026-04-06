/**
 * Componente de gestión de proveedores.
 * CRUD de proveedores vinculado al módulo de compras.
 */

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import { Badge } from "@/common/components/Badge";
import type { PurchasesActorContext, Supplier, CreateSupplierInput, UpdateSupplierInput } from "../types/purchases.types";

interface SuppliersPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
}

const initialForm: CreateSupplierInput = {
  name: "",
  rif: "",
  phone: "",
  contactPerson: "",
  notes: ""
};

export function SuppliersPanel({ tenantSlug, actor }: SuppliersPanelProps) {
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<CreateSupplierInput>(initialForm);
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");

  const { state, refresh, createSupplier, updateSupplier } = usePurchases({
    service: purchasesService,
    tenant: { tenantSlug },
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASES.SUPPLIER_CREATED", () => void refresh());
    const offUpdated = eventBus.on("PURCHASES.SUPPLIER_UPDATED", () => void refresh());
    return () => {
      offCreated();
      offUpdated();
    };
  }, [refresh]);

  const handleOpenCreate = () => {
    setForm(initialForm);
    setEditingSupplier(null);
    setActiveTab("form");
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      rif: supplier.rif ?? "",
      phone: supplier.phone ?? "",
      contactPerson: supplier.contactPerson ?? "",
      notes: supplier.notes ?? ""
    });
    setEditingSupplier(supplier);
    setActiveTab("form");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    let result;
    if (editingSupplier) {
      const input: UpdateSupplierInput = {
        localId: editingSupplier.localId,
        ...form
      };
      result = await updateSupplier(input);
    } else {
      result = await createSupplier(form);
    }

    if (result) {
      setActiveTab("list");
      setForm(initialForm);
      setEditingSupplier(null);
    }
  };

  const handleCancel = () => {
    setActiveTab("list");
    setForm(initialForm);
    setEditingSupplier(null);
  };

  return (
    <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-content-primary">Proveedores</h2>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {state.lastError && (
        <div className="mb-4 p-3 bg-state-error/10 border border-state-error/30 rounded-lg">
          <p className="text-state-error text-sm">{state.lastError.message}</p>
        </div>
      )}

      {activeTab === "list" ? (
        <div className="space-y-2">
          {state.suppliers.length === 0 ? (
            <div className="text-center py-8 text-content-tertiary">
              <svg className="w-12 h-12 mx-auto mb-3 text-content-tertiary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p>No hay proveedores registrados</p>
              <p className="text-sm mt-1">Crea tu primer proveedor para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 px-3 font-medium text-content-secondary">Nombre</th>
                    <th className="text-left py-2 px-3 font-medium text-content-secondary">RIF</th>
                    <th className="text-left py-2 px-3 font-medium text-content-secondary">Teléfono</th>
                    <th className="text-left py-2 px-3 font-medium text-content-secondary">Contacto</th>
                    <th className="text-left py-2 px-3 font-medium text-content-secondary">Estado</th>
                    <th className="text-right py-2 px-3 font-medium text-content-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {state.suppliers.map((supplier) => (
                    <tr key={supplier.localId} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 px-3 text-content-primary font-medium">{supplier.name}</td>
                      <td className="py-2 px-3 text-content-secondary font-mono text-xs">{supplier.rif || "-"}</td>
                      <td className="py-2 px-3 text-content-secondary">{supplier.phone || "-"}</td>
                      <td className="py-2 px-3 text-content-secondary">{supplier.contactPerson || "-"}</td>
                      <td className="py-2 px-3">
                        <Badge variant={supplier.isActive ? "success" : "default"}>
                          {supplier.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(supplier)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-4">
          <h3 className="text-lg font-medium text-content-primary mb-4">
            {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                placeholder="Nombre del proveedor"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                RIF
              </label>
              <input
                type="text"
                value={form.rif}
                onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono"
                placeholder="J-123456789"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                placeholder="04141234567"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Persona de Contacto
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                placeholder="Nombre del contacto"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-content-secondary mb-1">
                Notas
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm resize-none"
                placeholder="Notas adicionales sobre el proveedor"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-surface-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-content-secondary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={state.isSubmitting || !form.name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {state.isSubmitting ? "Guardando..." : editingSupplier ? "Actualizar" : "Crear Proveedor"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}