/**
 * Lista de Tenants.
 * Componente para visualizar y gestionar todos los tenants del sistema.
 * 
 * Funcionalidades:
 * - Listar tenants en tabla
 * - Crear nuevo tenant
 * - Editar tenant existente
 * - Eliminar tenant
 * - Acceder al ERP de un tenant
 */

import { useEffect, useState } from "react";
import type { Tenant, CreateTenantInput, UpdateTenantInput } from "../types/admin.types";

interface TenantsListProps {
  tenants: Tenant[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onUpdate: (id: string, input: UpdateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: { message: string } }>;
  onAccessTenant: (tenant: Tenant) => void;
}

/**
 * Componente que Renderiza la lista de tenants con formulario inline.
 */
export function TenantsList({ 
  tenants, 
  isLoading, 
  onRefresh, 
  onCreate, 
  onUpdate, 
  onDelete,
  onAccessTenant 
}: TenantsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState<CreateTenantInput>({
    name: "",
    slug: "",
    ownerEmail: "",
    contactEmail: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      await onUpdate(editingTenant.id, formData);
    } else {
      await onCreate(formData);
    }
    setShowForm(false);
    setEditingTenant(null);
    setFormData({ name: "", slug: "", ownerEmail: "", contactEmail: "", phone: "", address: "" });
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      ownerEmail: tenant.contactEmail || "",
      contactEmail: tenant.contactEmail || "",
      phone: tenant.phone || "",
      address: tenant.address || ""
    });
    setShowForm(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Tenants</h1>
          <p className="text-content-secondary">Gestión de empresas y negocios</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingTenant(null); setFormData({ name: "", slug: "", ownerEmail: "", contactEmail: "", phone: "", address: "" }); }}
          className="btn btn-primary"
        >
          + Nuevo Tenant
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-content-primary">
              {editingTenant ? "Editar Tenant" : "Nuevo Tenant"}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Slug (URL)</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>
              </div>
              {!editingTenant && (
                <div>
                  <label className="label">Email del Owner</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email de Contacto</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Teléfono</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Dirección</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">
                  {editingTenant ? "Guardar" : "Crear"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingTenant(null); }} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          <table className="w-full">
            <thead className="bg-surface-100 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Nombre</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Slug</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Creado</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {tenant.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                          {tenant.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-content-primary">{tenant.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-content-secondary">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${tenant.isActive ? "badge-success" : "badge-error"}`}>
                      {tenant.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-content-secondary">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onAccessTenant(tenant)}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        Entrar
                      </button>
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="text-sm text-content-secondary hover:text-content-primary"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(tenant.id)}
                        className="text-sm text-state-error hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && !isLoading && (
            <div className="p-8 text-center text-content-secondary">
              No hay tenants registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
