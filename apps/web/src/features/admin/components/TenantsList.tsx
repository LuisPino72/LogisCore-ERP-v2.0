/**
 * Lista de Tenants.
 * Componente para visualizar y gestionar todos los tenants del sistema.
 * 
 * Funcionalidades:
 * - Listar tenants en tabla
 * - Crear nuevo tenant con owner, logo y taxpayer info
 * - Editar tenant existente
 * - Eliminar tenant
 * - Acceder al ERP de un tenant
 */

import { useEffect, useState, useRef } from "react";
import { LoadingSpinner } from "@/common";
import type { Tenant, CreateTenantInput, UpdateTenantInput, SecurityUser } from "../types/admin.types";

interface TenantsListProps {
  tenants: Tenant[];
  businessTypes: { id: string; name: string }[];
  securityUsers: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onUpdate: (id: string, input: UpdateTenantInput) => Promise<{ ok: boolean; data?: Tenant; error?: { message: string } }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: { message: string } }>;
  onAccessTenant: (tenant: Tenant) => void;
  onLoadBusinessTypes: () => void;
  onLoadSecurityUsers: () => void;
}

interface TaxpayerInfo {
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
  regimen?: string;
}

const initialFormData: CreateTenantInput & { taxpayerInfo: TaxpayerInfo } = {
  name: "",
  slug: "",
  ownerEmail: "",
  ownerUserId: "",
  businessTypeId: "",
  contactEmail: "",
  phone: "",
  address: "",
  taxpayerInfo: {
    rif: "",
    razonSocial: "",
    direccionFiscal: "",
    regimen: "ORDINARIO"
  }
};

export function TenantsList({ 
  tenants, 
  businessTypes,
  securityUsers,
  isLoading, 
  onRefresh, 
  onCreate, 
  onUpdate, 
  onDelete,
  onAccessTenant,
  onLoadBusinessTypes,
  onLoadSecurityUsers
}: TenantsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showNewOwner, setShowNewOwner] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onRefresh();
    onLoadBusinessTypes();
    onLoadSecurityUsers();
  }, [onRefresh, onLoadBusinessTypes, onLoadSecurityUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const input: CreateTenantInput | UpdateTenantInput = editingTenant
      ? {
          name: formData.name,
          businessTypeId: formData.businessTypeId || undefined,
          contactEmail: formData.contactEmail,
          phone: formData.phone,
          address: formData.address,
          logoUrl: formData.logoUrl,
          taxpayerInfo: formData.taxpayerInfo?.rif ? formData.taxpayerInfo : undefined,
          ownerUserId: formData.ownerUserId || undefined
        }
      : {
          name: formData.name,
          slug: formData.slug,
          ownerEmail: formData.ownerEmail,
          businessTypeId: formData.businessTypeId || undefined,
          contactEmail: formData.contactEmail,
          phone: formData.phone,
          address: formData.address,
          taxpayerInfo: formData.taxpayerInfo?.rif ? formData.taxpayerInfo : undefined
        };

    if (editingTenant) {
      await onUpdate(editingTenant.id, input as UpdateTenantInput);
    } else {
      await onCreate(input as CreateTenantInput);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTenant(null);
    setFormData(initialFormData);
    setLogoPreview(null);
    setShowNewOwner(false);
    setNewOwnerEmail("");
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    const taxpayerInfo = tenant.taxpayerInfo as TaxpayerInfo | undefined;
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      ownerEmail: "",
      ownerUserId: tenant.ownerUserId,
      businessTypeId: tenant.businessTypeId || "",
      contactEmail: tenant.contactEmail || "",
      phone: tenant.phone || "",
      address: tenant.address || "",
      logoUrl: tenant.logoUrl,
      taxpayerInfo: taxpayerInfo || { rif: "", razonSocial: "", direccionFiscal: "", regimen: "ORDINARIO" }
    });
    setLogoPreview(tenant.logoUrl || null);
    setShowForm(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
  };

  const businessTypeOptions = [
    { value: "", label: "Seleccionar tipo de negocio..." },
    ...businessTypes.map(bt => ({ value: bt.id, label: bt.name }))
  ];

  const ownerOptions = [
    { value: "", label: "Seleccionar owner..." },
    ...securityUsers.map(u => ({ value: u.userId, label: u.email }))
  ];

  const getOwnerEmail = (userId: string) => {
    const user = securityUsers.find(u => u.userId === userId);
    return user?.email || "Sin owner";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Tenants</h1>
          <p className="text-content-secondary">Gestión de empresas y negocios</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección: Información Básica */}
              <div>
                <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Básica</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nombre de la Empresa</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: !editingTenant ? generateSlug(e.target.value) : formData.slug })}
                      required
                    />
                  </div>
                  {!editingTenant && (
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
                  )}
                </div>
              </div>

              {/* Sección: Owner */}
              <div>
                <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
                {!editingTenant ? (
                  <div>
                    <label className="label">Email del Owner</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      placeholder="owner@empresa.com"
                      required
                    />
                    <p className="text-xs text-content-tertiary mt-1">Se creará automáticamente un usuario con este email</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="label">Owner Actual</label>
                        <input
                          type="text"
                          className="input bg-surface-50"
                          value={getOwnerEmail(formData.ownerUserId)}
                          disabled
                        />
                      </div>
                    </div>
                    {!showNewOwner ? (
                      <button
                        type="button"
                        onClick={() => setShowNewOwner(true)}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        + Cambiar owner
                      </button>
                    ) : (
                      <div className="p-3 bg-surface-50 rounded-lg space-y-3">
                        <label className="label">Nuevo Owner (seleccionar usuario existente)</label>
                        <select
                          className="input"
                          value={formData.ownerUserId}
                          onChange={(e) => setFormData({ ...formData, ownerUserId: e.target.value })}
                        >
                          {ownerOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowNewOwner(false)}
                          className="text-sm text-content-secondary"
                        >
                          Cancelar cambio
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sección: Logo */}
              <div>
                <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Logo de la Empresa</h3>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-surface-300 flex items-center justify-center bg-surface-50 overflow-hidden cursor-pointer hover:border-brand-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <div className="text-sm text-content-secondary">
                    <p>Click para subir logo</p>
                    <p className="text-content-tertiary">PNG, JPG hasta 2MB</p>
                  </div>
                </div>
              </div>

              {/* Sección: Información Fiscal */}
              <div>
                <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Fiscal (SENIAT)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">RIF</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.taxpayerInfo?.rif || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        taxpayerInfo: { ...formData.taxpayerInfo!, rif: e.target.value }
                      })}
                      placeholder="J-12345678-9"
                    />
                  </div>
                  <div>
                    <label className="label">Régimen</label>
                    <select
                      className="input"
                      value={formData.taxpayerInfo?.regimen || "ORDINARIO"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        taxpayerInfo: { ...formData.taxpayerInfo!, regimen: e.target.value }
                      })}
                    >
                      <option value="ORDINARIO">Ordinario</option>
                      <option value="ESPECIAL">Especial</option>
                      <option value="SIMPLIFICADO">Simplificado</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Razón Social</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.taxpayerInfo?.razonSocial || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        taxpayerInfo: { ...formData.taxpayerInfo!, razonSocial: e.target.value }
                      })}
                      placeholder="Empresa C.A."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Dirección Fiscal</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.taxpayerInfo?.direccionFiscal || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        taxpayerInfo: { ...formData.taxpayerInfo!, direccionFiscal: e.target.value }
                      })}
                      placeholder="Av. Principal, Ciudad, Estado"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Contacto */}
              <div>
                <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tipo de Negocio</label>
                    <select
                      className="input"
                      value={formData.businessTypeId}
                      onChange={(e) => setFormData({ ...formData, businessTypeId: e.target.value })}
                    >
                      {businessTypeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0212-1234567"
                    />
                  </div>
                  <div>
                    <label className="label">Email de Contacto</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                  <div>
                    <label className="label">Dirección</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Dirección de la empresa"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="submit" className="btn btn-primary">
                  {editingTenant ? "Guardar Cambios" : "Crear Tenant"}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <LoadingSpinner message="Cargando tenants..." />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface-100 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Empresa</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Owner</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">RIF</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tipo</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map(tenant => {
                  const taxpayerInfo = tenant.taxpayerInfo as TaxpayerInfo | undefined;
                  return (
                    <tr key={tenant.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {tenant.logoUrl ? (
                            <img src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-lg">
                              {tenant.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-content-primary block">{tenant.name}</span>
                            <span className="text-xs text-content-tertiary">{tenant.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary">
                        {getOwnerEmail(tenant.ownerUserId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary">
                        {taxpayerInfo?.rif || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-content-secondary">
                        {tenant.businessTypeName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${tenant.isActive ? "badge-success" : "badge-error"}`}>
                          {tenant.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => onAccessTenant(tenant)}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
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
                  );
                })}
              </tbody>
            </table>
          )}
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
