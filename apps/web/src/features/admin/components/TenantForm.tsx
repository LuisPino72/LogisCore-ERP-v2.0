import { useState, useRef } from "react";
import type { CreateTenantInput, UpdateTenantInput, SecurityUser, Tenant } from "../types/admin.types";

interface TaxpayerInfo {
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
  regimen?: string;
}

interface TenantFormProps {
  initialData?: Tenant | null;
  businessTypes: { id: string; name: string }[];
  plans?: { id: string; name: string; price: number }[];
  securityUsers: SecurityUser[];
  onSubmit: (input: any) => Promise<void>;
  onCancel: () => void;
}

const emptyFormData: any = {
  name: "",
  slug: "",
  ownerEmail: "",
  ownerUserId: "",
  planId: "", // Nuevo campo obligatorio para creación
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

export function TenantForm({ initialData, businessTypes, plans, securityUsers, onSubmit, onCancel }: TenantFormProps) {
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    businessTypeId: initialData.businessTypeId || "",
    contactEmail: initialData.contactEmail || "",
    phone: initialData.phone || "",
    address: initialData.address || "",
    taxpayerInfo: (initialData.taxpayerInfo as unknown as TaxpayerInfo) || emptyFormData.taxpayerInfo
  } : emptyFormData);
  
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);
  const [showNewOwner, setShowNewOwner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setFormData((prev: any) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-content-primary">
          {initialData ? "Editar Tenant" : "Nuevo Tenant"}
        </h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre de la Empresa</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              {!initialData && (
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

          {/* Owner Selection */}
          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
            {!initialData ? (
              <input
                type="email"
                className="input"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="owner@empresa.com"
                required
              />
            ) : (
              <div className="space-y-2">
                 <select
                    className="input"
                    value={formData.ownerUserId}
                    onChange={(e) => setFormData({ ...formData, ownerUserId: e.target.value })}
                  >
                    <option value="">Seleccionar owner...</option>
                    {securityUsers.map(u => (
                      <option key={u.userId} value={u.userId}>{u.email}</option>
                    ))}
                  </select>
              </div>
            )}
          </div>

          {/* Plan Selection (Only for New Tenants) */}
          {!initialData && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Plan de Suscripción</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="label">Elegir un Plan</label>
                  <select
                    className="input"
                    value={formData.planId}
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar plan...</option>
                    {(plans || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price}/mes</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Logo */}
          <div>
             <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Logo</h3>
             <div 
               className="w-20 h-20 rounded-lg border-2 border-dashed border-surface-300 flex items-center justify-center bg-surface-50 overflow-hidden cursor-pointer"
               onClick={() => fileInputRef.current?.click()}
             >
               {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <span>+</span>}
             </div>
             <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          {/* Fiscal Info */}
          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Fiscal</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="label">RIF</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.taxpayerInfo?.rif || ""}
                    onChange={(e) => setFormData({ ...formData, taxpayerInfo: { ...formData.taxpayerInfo, rif: e.target.value } })}
                  />
               </div>
               <div>
                  <label className="label">Régimen</label>
                  <select
                    className="input"
                    value={formData.taxpayerInfo?.regimen || "ORDINARIO"}
                    onChange={(e) => setFormData({ ...formData, taxpayerInfo: { ...formData.taxpayerInfo, regimen: e.target.value } })}
                  >
                    <option value="ORDINARIO">Ordinario</option>
                    <option value="ESPECIAL">Especial</option>
                  </select>
               </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
