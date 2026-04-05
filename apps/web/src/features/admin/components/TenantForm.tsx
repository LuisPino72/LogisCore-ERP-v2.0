import { useState, useRef, useEffect } from "react";
import type { SecurityUser, Tenant, EmployeeInput, WarehouseInput } from "../types/admin.types";
import { 
  validateRequired, 
  validateMaxLength, 
  validateEmail, 
  validateRif, 
  validatePhone, 
  validateSlug,
  validatePassword,
  VALIDATION_RULES
} from "@/common";

interface TaxpayerInfo {
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
  regimen: string;
}

interface TenantFormProps {
  initialData?: Tenant | null;
  businessTypes: { id: string; name: string }[];
  plans?: { id: string; name: string; price: number }[];
  securityUsers: SecurityUser[];
  onSubmit: (input: unknown) => Promise<void>;
  onCancel: () => void;
}

interface FormData {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFullName: string;
  ownerUserId: string;
  planId: string;
  trialDays: number;
  businessTypeId: string;
  contactEmail: string;
  phone: string;
  address: string;
  logoUrl: string;
  taxpayerInfo: TaxpayerInfo;
  employees: EmployeeInput[];
  hasWarehouse: boolean;
  warehouse: WarehouseInput;
}

const defaultTaxpayerInfo: TaxpayerInfo = {
  rif: "",
  razonSocial: "",
  direccionFiscal: "",
  regimen: "ORDINARIO"
};

const defaultWarehouse: WarehouseInput = {
  name: "",
  address: "",
  isDefault: true
};

const defaultFormData: FormData = {
  name: "",
  slug: "",
  ownerEmail: "",
  ownerPassword: "",
  ownerFullName: "",
  ownerUserId: "",
  planId: "",
  trialDays: 7,
  businessTypeId: "",
  contactEmail: "",
  phone: "",
  address: "",
  logoUrl: "",
  taxpayerInfo: defaultTaxpayerInfo,
  employees: [{ email: "", password: "", fullName: "" }],
  hasWarehouse: false,
  warehouse: defaultWarehouse
};

function getInitialFormData(initialData: Tenant | null | undefined): FormData {
  if (!initialData) return defaultFormData;
  
  const ti = initialData.taxpayerInfo;
  let parsedTi = { rif: "", razonSocial: "", direccionFiscal: "", regimen: "ORDINARIO" };
  
  if (ti) {
    if (typeof ti === "string") {
      try { parsedTi = { ...parsedTi, ...JSON.parse(ti) }; } catch { /* ignore parse error */ }
    } else if (typeof ti === "object") {
      parsedTi = { ...parsedTi, ...(ti as Record<string, unknown>) };
    }
  }
  
  return {
    name: initialData.name ?? "",
    slug: initialData.slug ?? "",
    ownerEmail: "",
    ownerPassword: "",
    ownerFullName: "",
    ownerUserId: initialData.ownerUserId ?? "",
    planId: "",
    trialDays: 7,
    businessTypeId: initialData.businessTypeId ?? "",
    contactEmail: initialData.contactEmail ?? "",
    phone: initialData.phone ?? "",
    address: initialData.address ?? "",
    logoUrl: initialData.logoUrl ?? "",
    taxpayerInfo: {
      rif: parsedTi.rif,
      razonSocial: parsedTi.razonSocial,
      direccionFiscal: parsedTi.direccionFiscal,
      regimen: parsedTi.regimen
    },
    employees: [{ email: "", password: "", fullName: "" }],
    hasWarehouse: false,
    warehouse: defaultWarehouse
  };
}

export function TenantForm({ initialData, businessTypes, plans, securityUsers, onSubmit, onCancel }: TenantFormProps) {
  const [formData, setFormData] = useState<FormData>(getInitialFormData(initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNew = !initialData;

  useEffect(() => {
    setFormData(getInitialFormData(initialData));
    setLogoPreview(initialData?.logoUrl || null);
    setErrors({});
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isNew) {
      const nameResult = validateRequired(formData.name, "Nombre");
      if (!nameResult.isValid) newErrors.name = nameResult.error || "Requerido";
      else {
        const maxResult = validateMaxLength(formData.name, VALIDATION_RULES.MAX_TEXT_LENGTH);
        if (!maxResult.isValid) newErrors.name = maxResult.error || "Máximo 20 caracteres";
      }

      const slugResult = validateSlug(formData.slug);
      if (!slugResult.isValid) newErrors.slug = slugResult.error || "Slug inválido";

      const ownerEmailResult = validateRequired(formData.ownerEmail, "Email del owner");
      if (!ownerEmailResult.isValid) newErrors.ownerEmail = ownerEmailResult.error || "Requerido";
      else {
        const emailFormat = validateEmail(formData.ownerEmail);
        if (!emailFormat.isValid) newErrors.ownerEmail = emailFormat.error || "Email inválido";
      }

      const ownerPasswordResult = validatePassword(formData.ownerPassword);
      if (!ownerPasswordResult.isValid) newErrors.ownerPassword = ownerPasswordResult.error || "Requerido";

      const ownerNameResult = validateRequired(formData.ownerFullName, "Nombre del owner");
      if (!ownerNameResult.isValid) newErrors.ownerFullName = ownerNameResult.error || "Requerido";
      else {
        const maxResult = validateMaxLength(formData.ownerFullName, VALIDATION_RULES.MAX_TEXT_LENGTH);
        if (!maxResult.isValid) newErrors.ownerFullName = maxResult.error || "Máximo 20 caracteres";
      }

      formData.employees.forEach((emp, idx) => {
        if (emp.email || emp.password || emp.fullName) {
          if (!emp.email) newErrors[`employee_${idx}_email`] = "Email requerido";
          else {
            const emailResult = validateEmail(emp.email);
            if (!emailResult.isValid) newErrors[`employee_${idx}_email`] = emailResult.error || "Email inválido";
          }
          if (!emp.password) newErrors[`employee_${idx}_password`] = "Contraseña requerida";
          else {
            const pwdResult = validatePassword(emp.password);
            if (!pwdResult.isValid) newErrors[`employee_${idx}_password`] = pwdResult.error || "Mínimo 6 caracteres";
          }
          if (!emp.fullName) newErrors[`employee_${idx}_fullName`] = "Nombre requerido";
        }
      });

      if (formData.hasWarehouse) {
        const warehouseNameValue = formData.warehouse.name || "";
        const warehouseNameResult = validateRequired(warehouseNameValue, "Nombre del almacén");
        if (!warehouseNameResult.isValid) newErrors.warehouseName = warehouseNameResult.error || "Requerido";
        else {
          const maxResult = validateMaxLength(warehouseNameValue, VALIDATION_RULES.MAX_TEXT_LENGTH);
          if (!maxResult.isValid) newErrors.warehouseName = maxResult.error || "Máximo 20 caracteres";
        }
      }
    }

    if (formData.contactEmail) {
      const emailResult = validateEmail(formData.contactEmail);
      if (!emailResult.isValid) newErrors.contactEmail = emailResult.error || "Email inválido";
    }

    if (formData.phone) {
      const phoneResult = validatePhone(formData.phone);
      if (!phoneResult.isValid) newErrors.phone = phoneResult.error || "Teléfono inválido";
    }

    if (formData.taxpayerInfo?.rif) {
      const rifResult = validateRif(formData.taxpayerInfo.rif);
      if (!rifResult.isValid) newErrors.rif = rifResult.error || "RIF inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSubmitData = (): unknown => {
    const baseData = {
      name: formData.name,
      businessTypeId: formData.businessTypeId || undefined,
      contactEmail: formData.contactEmail || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      logoUrl: formData.logoUrl || undefined,
      taxpayerInfo: formData.taxpayerInfo?.rif || formData.taxpayerInfo?.razonSocial || formData.taxpayerInfo?.direccionFiscal
        ? {
            rif: formData.taxpayerInfo.rif || undefined,
            razonSocial: formData.taxpayerInfo.razonSocial || undefined,
            direccionFiscal: formData.taxpayerInfo.direccionFiscal || undefined,
            regimen: formData.taxpayerInfo.regimen || undefined
          }
        : undefined,
      timezone: "America/Caracas",
      currency: "VES"
    };

    if (isNew) {
      const validEmployees = formData.employees.filter(e => e.email && e.password && e.fullName).map(e => ({
        email: e.email,
        password: e.password,
        fullName: e.fullName
      }));
      return {
        ...baseData,
        slug: formData.slug,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword,
        ownerFullName: formData.ownerFullName,
        planId: formData.planId,
        trialDays: formData.trialDays || undefined,
        employees: validEmployees.length > 0 ? validEmployees : undefined,
        hasWarehouse: formData.hasWarehouse || undefined,
        warehouse: formData.hasWarehouse && formData.warehouse.name ? formData.warehouse : undefined
      };
    }

    return {
      ...baseData,
      ownerUserId: formData.ownerUserId || undefined
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(getSubmitData());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updateField = (field: keyof FormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateTaxpayerInfo = (field: keyof TaxpayerInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      taxpayerInfo: { ...prev.taxpayerInfo, [field]: value }
    }));
    if (field === "rif" && errors.rif) setErrors((prev) => ({ ...prev, rif: "" }));
  };

  const updateEmployee = (index: number, field: keyof EmployeeInput, value: string) => {
    setFormData(prev => {
      const newEmployees = [...prev.employees];
      newEmployees[index] = { ...newEmployees[index], [field]: value };
      return { ...prev, employees: newEmployees };
    });
    const errorKey = `employee_${index}_${field}`;
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: "" }));
  };

  const addEmployee = () => {
    setFormData(prev => ({
      ...prev,
      employees: [...prev.employees, { email: "", password: "", fullName: "" }]
    }));
  };

  const removeEmployee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.filter((_, i) => i !== index)
    }));
  };

  const updateWarehouse = (field: keyof WarehouseInput, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      warehouse: { ...prev.warehouse, [field]: value }
    }));
    if (field === "name" && errors.warehouseName) setErrors(prev => ({ ...prev, warehouseName: "" }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-content-primary">
          {initialData ? "Editar Tenant" : "Nuevo Tenant"}
        </h2>
      </div>
      <div className="card-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Básica</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre de la Empresa</label>
                <input
                  type="text"
                  className={`input ${errors.name ? "border-red-500" : ""}`}
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                <p className="text-xs text-content-secondary mt-1">{formData.name.length}/{VALIDATION_RULES.MAX_TEXT_LENGTH}</p>
              </div>
              {isNew && (
                <div>
                  <label className="label">Slug (URL)</label>
                  <input
                    type="text"
                    className={`input ${errors.slug ? "border-red-500" : ""}`}
                    value={formData.slug}
                    onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    maxLength={VALIDATION_RULES.SLUG_MAX_LENGTH}
                    required
                  />
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
                  <p className="text-xs text-content-secondary mt-1">{formData.slug.length}/{VALIDATION_RULES.SLUG_MAX_LENGTH}</p>
                </div>
              )}
            </div>
          </div>

          {businessTypes && businessTypes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Tipo de Negocio</h3>
              <select
                className="input"
                value={formData.businessTypeId}
                onChange={(e) => updateField("businessTypeId", e.target.value)}
              >
                <option value="">Seleccionar tipo de negocio...</option>
                {businessTypes.map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.name}</option>
                ))}
              </select>
            </div>
          )}

          {isNew && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className={`input ${errors.ownerEmail ? "border-red-500" : ""}`}
                    value={formData.ownerEmail}
                    onChange={(e) => updateField("ownerEmail", e.target.value)}
                    placeholder="owner@empresa.com"
                    required
                  />
                  {errors.ownerEmail && <p className="text-xs text-red-500 mt-1">{errors.ownerEmail}</p>}
                </div>
                <div>
                  <label className="label">Nombre Completo</label>
                  <input
                    type="text"
                    className={`input ${errors.ownerFullName ? "border-red-500" : ""}`}
                    value={formData.ownerFullName}
                    onChange={(e) => updateField("ownerFullName", e.target.value)}
                    placeholder="Juan Pérez"
                    maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                    required
                  />
                  {errors.ownerFullName && <p className="text-xs text-red-500 mt-1">{errors.ownerFullName}</p>}
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input
                    type="password"
                    className={`input ${errors.ownerPassword ? "border-red-500" : ""}`}
                    value={formData.ownerPassword}
                    onChange={(e) => updateField("ownerPassword", e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  {errors.ownerPassword && <p className="text-xs text-red-500 mt-1">{errors.ownerPassword}</p>}
                </div>
              </div>
            </div>
          )}

          {!isNew && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
              <select
                className="input"
                value={formData.ownerUserId}
                onChange={(e) => updateField("ownerUserId", e.target.value)}
              >
                <option value="">Seleccionar owner...</option>
                {securityUsers.map(u => (
                  <option key={u.userId} value={u.userId}>{u.email}</option>
                ))}
              </select>
            </div>
          )}

          {isNew && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b pb-1">
                <h3 className="text-sm font-medium text-content-primary">Empleados</h3>
                <button type="button" onClick={addEmployee} className="btn btn-secondary text-sm py-1 px-2">
                  + Agregar
                </button>
              </div>
              <div className="space-y-4">
                {formData.employees.map((employee, index) => (
                  <div key={index} className="p-3 bg-surface-50 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-content-secondary">Empleado {index + 1}</span>
                      {formData.employees.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeEmployee(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Email</label>
                        <input
                          type="email"
                          className={`input ${errors[`employee_${index}_email`] ? "border-red-500" : ""}`}
                          value={employee.email}
                          onChange={(e) => updateEmployee(index, "email", e.target.value)}
                          placeholder="empleado@empresa.com"
                        />
                        {errors[`employee_${index}_email`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_email`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Nombre Completo</label>
                        <input
                          type="text"
                          className={`input ${errors[`employee_${index}_fullName`] ? "border-red-500" : ""}`}
                          value={employee.fullName}
                          onChange={(e) => updateEmployee(index, "fullName", e.target.value)}
                          placeholder="María García"
                          maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                        />
                        {errors[`employee_${index}_fullName`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_fullName`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="label text-xs">Contraseña</label>
                        <input
                          type="password"
                          className={`input ${errors[`employee_${index}_password`] ? "border-red-500" : ""}`}
                          value={employee.password}
                          onChange={(e) => updateEmployee(index, "password", e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                        {errors[`employee_${index}_password`] && (
                          <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_password`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isNew && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Almacén</h3>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="hasWarehouse"
                  checked={formData.hasWarehouse}
                  onChange={(e) => updateField("hasWarehouse", e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="hasWarehouse" className="text-sm">¿Este tenant tiene almacén?</label>
              </div>
              {formData.hasWarehouse && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-surface-50 rounded-lg border">
                  <div>
                    <label className="label">Nombre del Almacén</label>
                    <input
                      type="text"
                      className={`input ${errors.warehouseName ? "border-red-500" : ""}`}
                      value={formData.warehouse.name}
                      onChange={(e) => updateWarehouse("name", e.target.value)}
                      placeholder="Almacén Principal"
                      maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                      required
                    />
                    {errors.warehouseName && <p className="text-xs text-red-500 mt-1">{errors.warehouseName}</p>}
                  </div>
                  <div>
                    <label className="label">Dirección</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.warehouse.address || ""}
                      onChange={(e) => updateWarehouse("address", e.target.value)}
                      placeholder="Dirección del almacén"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.warehouse.isDefault}
                      onChange={(e) => updateWarehouse("isDefault", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isDefault" className="text-sm">¿Es el almacén principal?</label>
                  </div>
                </div>
              )}
            </div>
          )}

          {isNew && (
            <div>
              <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Plan de Suscripción</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="label">Elegir un Plan</label>
                  <select
                    className="input"
                    value={formData.planId}
                    onChange={(e) => updateField("planId", e.target.value)}
                    required
                  >
                    <option value="">Seleccionar plan...</option>
                    {(plans || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price}/mes</option>
                    ))}
                  </select>
                </div>
                {formData.planId && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="enableTrial"
                      checked={formData.trialDays > 0}
                      onChange={(e) => updateField("trialDays", e.target.checked ? 7 : 0)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="enableTrial" className="text-sm">Habilitar período de prueba</label>
                    {formData.trialDays > 0 && (
                      <input
                        type="number"
                        className="input w-20"
                        value={formData.trialDays}
                        onChange={(e) => updateField("trialDays", Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
                        min={1}
                        max={7}
                      />
                    )}
                  </div>
                )}
                {formData.trialDays > 0 && (
                  <p className="text-xs text-content-secondary">El tenant tendrá acceso gratuito por {formData.trialDays} días</p>
                )}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información de Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email de Contacto</label>
                <input
                  type="email"
                  className={`input ${errors.contactEmail ? "border-red-500" : ""}`}
                  value={formData.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  placeholder="contacto@empresa.com"
                />
                {errors.contactEmail && <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>}
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  className={`input ${errors.phone ? "border-red-500" : ""}`}
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="04121234567"
                  maxLength={VALIDATION_RULES.PHONE_LENGTH}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div className="col-span-2">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  className="input"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH * 2}
                />
              </div>
            </div>
          </div>

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

          <div>
            <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Fiscal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">RIF</label>
                <input
                  type="text"
                  className={`input ${errors.rif ? "border-red-500" : ""}`}
                  value={formData.taxpayerInfo.rif}
                  onChange={(e) => updateTaxpayerInfo("rif", e.target.value.toUpperCase())}
                  placeholder="J-123456789"
                />
                {errors.rif && <p className="text-xs text-red-500 mt-1">{errors.rif}</p>}
              </div>
              <div>
                <label className="label">Régimen</label>
                <select
                  className="input"
                  value={formData.taxpayerInfo.regimen}
                  onChange={(e) => updateTaxpayerInfo("regimen", e.target.value)}
                >
                  <option value="ORDINARIO">Ordinario</option>
                  <option value="ESPECIAL">Especial</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Razón Social</label>
                <input
                  type="text"
                  className="input"
                  value={formData.taxpayerInfo.razonSocial}
                  onChange={(e) => updateTaxpayerInfo("razonSocial", e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Dirección Fiscal</label>
                <input
                  type="text"
                  className="input"
                  value={formData.taxpayerInfo.direccionFiscal}
                  onChange={(e) => updateTaxpayerInfo("direccionFiscal", e.target.value)}
                  placeholder="Dirección fiscal completa"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={isSubmitting}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
