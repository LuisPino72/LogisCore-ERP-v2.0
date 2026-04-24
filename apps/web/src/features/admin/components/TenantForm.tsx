import { useState, useEffect } from "react";
import type { SecurityUser, Tenant, EmployeeInput, WarehouseInput, EmployeeManagement, BusinessType, Plan } from "../types/admin.types";
import { 
  validateRequired, 
  validateMaxLength, 
  validateEmail, 
  validatePassword,
  validateSlug,
  VALIDATION_RULES
} from "@/common";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { TenantBasicInfoForm } from "./forms/TenantBasicInfoForm";
import { BusinessTypeSelect } from "./forms/BusinessTypeSelect";
import { OwnerSection } from "./forms/OwnerSection";
import { ExistingEmployeesSection } from "./forms/ExistingEmployeesSection";
import { NewEmployeesSection } from "./forms/NewEmployeesSection";
import { EmptyEmployeesSection } from "./forms/EmptyEmployeesSection";
import { WarehouseForm } from "./forms/WarehouseForm";
import { SubscriptionPlanForm } from "./forms/SubscriptionPlanForm";
import { ContactInfoForm } from "./forms/ContactInfoForm";
import { LogoUpload } from "./forms/LogoUpload";
import { TaxpayerInfoForm } from "./forms/TaxpayerInfoForm";

interface TaxpayerInfo {
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
}

interface TenantFormProps {
  initialData?: Tenant | null;
  businessTypes?: BusinessType[];
  plans?: Plan[];
  securityUsers?: SecurityUser[];
  tenantEmployees?: SecurityUser[];
  onSubmit: (data: unknown) => Promise<void>;
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
  timezone: string;
  currency: string;
  taxpayerInfo: TaxpayerInfo;
  employees: EmployeeInput[];
  existingEmployees: EmployeeManagement[];
  hasWarehouse: boolean;
  warehouse: WarehouseInput;
}

const defaultTaxpayerInfo: TaxpayerInfo = {
  rif: "",
  razonSocial: "",
  direccionFiscal: "",
};

const defaultWarehouse: WarehouseInput = {
  name: "",
  address: "",
  isDefault: true,
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
  timezone: "America/Caracas",
  currency: "VES",
  taxpayerInfo: defaultTaxpayerInfo,
  employees: [{ email: "", password: "", fullName: "" }],
  existingEmployees: [],
  hasWarehouse: false,
  warehouse: defaultWarehouse
};

function getInitialFormData(initialData: Tenant | null | undefined, tenantEmployees?: SecurityUser[]): FormData {
  if (!initialData) return defaultFormData;
  
  const ti = initialData.taxpayerInfo;
  let parsedTi = { rif: "", razonSocial: "", direccionFiscal: "" };
  
  if (ti) {
    if (typeof ti === "string") {
      try { parsedTi = { ...parsedTi, ...JSON.parse(ti) }; } catch { /* ignore parse errors */ }
    } else if (typeof ti === "object") {
      parsedTi = { ...parsedTi, ...(ti as Record<string, unknown>) };
    }
  }
  
  const existingEmployees: EmployeeManagement[] = (tenantEmployees || []).map(emp => ({
    email: emp.email,
    fullName: emp.fullName || "",
    action: "update" as const,
    userId: emp.userId,
    isActive: emp.isActive,
    permissions: emp.permissions || []
  }));
    
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
    timezone: (initialData as Record<string, unknown>).timezone ?? "America/Caracas",
    currency: (initialData as Record<string, unknown>).currency ?? "VES",
    taxpayerInfo: {
      rif: parsedTi.rif,
      razonSocial: parsedTi.razonSocial,
      direccionFiscal: parsedTi.direccionFiscal,
    },
    employees: [{ email: "", password: "", fullName: "" }],
    existingEmployees,
    hasWarehouse: false,
    warehouse: defaultWarehouse
  };
}

export function TenantForm({ 
  initialData, 
  businessTypes, 
  plans, 
  securityUsers, 
  tenantEmployees,
  onSubmit, 
  onCancel 
}: TenantFormProps) {
  const [formData, setFormData] = useState<FormData>(() => getInitialFormData(initialData, tenantEmployees));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(() => initialData?.logoUrl || null);
  const [deletedEmployeeIds, setDeletedEmployeeIds] = useState<string[]>([]);

  const isNew = !initialData;
  
  useEffect(() => {
    setFormData(getInitialFormData(initialData, tenantEmployees));
    setLogoPreview(initialData?.logoUrl || null);
    setDeletedEmployeeIds([]);
  }, [initialData, tenantEmployees]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const updateTaxpayerInfo = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated.taxpayerInfo = { ...prev.taxpayerInfo, [field]: value };
      return updated;
    });
  };

  const updateWarehouse = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev };
      updated.warehouse = { ...prev.warehouse, [field]: value };
      return updated;
    });
    if (field === "name" && errors.warehouseName) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.warehouseName;
        return newErrors;
      });
    }
  };

  const updateExistingEmployee = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      existingEmployees: prev.existingEmployees.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

  const updateEmployee = (index: number, field: keyof EmployeeInput, value: string) => {
    setFormData(prev => ({
      ...prev,
      employees: prev.employees.map((emp, i) => 
        i === index ? { ...emp, [field]: value } : emp
      )
    }));
  };

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
          
          if (!emp.fullName) newErrors[`employee_${idx}_fullName`] = "Nombre requerido";
          else {
            const maxResult = validateMaxLength(emp.fullName, VALIDATION_RULES.MAX_TEXT_LENGTH);
            if (!maxResult.isValid) newErrors[`employee_${idx}_fullName`] = maxResult.error || "Máximo 20 caracteres";
          }
          
          if (!emp.password) {
            newErrors[`employee_${idx}_password`] = "Contraseña requerida";
          } else {
            const passResult = validatePassword(emp.password);
            if (!passResult.isValid) newErrors[`employee_${idx}_password`] = passResult.error || "Mínimo 6 caracteres";
          }
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSubmitData = (): unknown => {
    const baseData: Record<string, unknown> = {
      name: formData.name,
      businessTypeId: formData.businessTypeId || undefined,
      contactEmail: formData.contactEmail || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      logoUrl: formData.logoUrl || undefined,
      timezone: formData.timezone || undefined,
      currency: formData.currency || undefined,
    };
    
    if (formData.taxpayerInfo?.rif || formData.taxpayerInfo?.razonSocial || formData.taxpayerInfo?.direccionFiscal) {
      baseData.taxpayerInfo = {
        rif: formData.taxpayerInfo.rif || undefined,
        razonSocial: formData.taxpayerInfo.razonSocial || undefined,
        direccionFiscal: formData.taxpayerInfo.direccionFiscal || undefined,
      };
    }
    
    if (isNew) {
      const validEmployees = formData.employees
        .filter(e => e.email && e.password && e.fullName)
        .map(e => ({
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
    
const existingEmployeesWithChanges = formData.existingEmployees
  .filter(e => e.action !== "update" || e.fullName !== undefined)
  .map(e => {
    const emp: EmployeeManagement = {
      email: e.email || "",
      fullName: e.fullName || "",
      action: e.action,
      userId: e.userId || "",
      isActive: e.isActive,
      permissions: e.permissions || []
    };
    return emp;
  });
    
const newEmployeesToCreate = formData.employees
  .filter(e => e.email && e.password && e.fullName)
  .map(e => ({
    email: e.email || "",
    password: e.password || "",
    fullName: e.fullName || "",
    action: "create" as const,
    userId: "",
    isActive: true,
    permissions: e.permissions || []
  }));
    
    const deletedEmployees = deletedEmployeeIds.map(userId => ({
      email: "",
      fullName: "",
      action: "delete" as const,
      userId,
      isActive: false
    }));
    
    const allEmployees: EmployeeManagement[] = [
      ...existingEmployeesWithChanges, 
      ...newEmployeesToCreate,
      ...deletedEmployees
    ];
    
    return {
      ...baseData,
      ownerUserId: formData.ownerUserId || undefined,
      employees: allEmployees.length > 0 ? allEmployees : undefined
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

  const addNewEmployee = () => {
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

  const markEmployeeForDeletion = (index: number) => {
    const employee = formData.existingEmployees[index];
    if (employee?.userId) {
      setDeletedEmployeeIds(prev => [...prev, employee.userId]);
    }
    setFormData(prev => ({
      ...prev,
      existingEmployees: prev.existingEmployees.filter((_, i) => i !== index)
    }));
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

  return (
    <Card>
      <div className="card-header">
        <h2 className="font-semibold text-content-primary">
          {initialData ? "Editar Tenant" : "Nuevo Tenant"}
        </h2>
      </div>
      <div className="card-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        <form onSubmit={handleSubmit} className="stack-md">
          <TenantBasicInfoForm 
            formData={{ name: formData.name, slug: formData.slug }}
            errors={errors}
            isNew={isNew}
            onChange={updateField} 
          />

          <BusinessTypeSelect 
            formData={{ businessTypeId: formData.businessTypeId }}
            businessTypes={businessTypes}
            onChange={updateField}
          />

          {isNew && (
            <OwnerSection 
              formData={{ ownerEmail: formData.ownerEmail, ownerFullName: formData.ownerFullName, ownerPassword: formData.ownerPassword, ownerUserId: formData.ownerUserId }}
              errors={errors}
              isNew={isNew}
              securityUsers={securityUsers}
              onChange={updateField}
            />
          )}

          {!isNew && (
            <>
              <ExistingEmployeesSection 
                formData={{ existingEmployees: formData.existingEmployees }}
                errors={errors}
                onUpdateEmployee={updateExistingEmployee}
                onMarkForDeletion={markEmployeeForDeletion}
                onAddNew={addNewEmployee}
              />

              {formData.employees.length > 0 && (
                <NewEmployeesSection 
                  formData={{ employees: formData.employees }}
                  errors={errors}
                  onUpdateEmployee={updateEmployee}
                  onRemove={removeEmployee}
                  onAdd={addNewEmployee}
                />
              )}

              {formData.existingEmployees.length === 0 && formData.employees.length === 0 && (
                <EmptyEmployeesSection onAdd={addNewEmployee} />
              )}
            </>
          )}

          {isNew && (
            <NewEmployeesSection 
              formData={{ employees: formData.employees }}
              errors={errors}
              onUpdateEmployee={updateEmployee}
              onRemove={removeEmployee}
              onAdd={addNewEmployee}
            />
          )}

          {isNew && (
            <WarehouseForm 
              formData={{ hasWarehouse: formData.hasWarehouse, warehouse: formData.warehouse }}
              errors={errors}
              onChangeWarehouse={updateWarehouse}
              onChange={updateField}
            />
          )}

          {isNew && (
            <SubscriptionPlanForm 
              formData={{ planId: formData.planId, trialDays: formData.trialDays }}
              plans={plans || []}
              errors={errors}
              onChange={updateField}
            />
          )}

          <ContactInfoForm 
            formData={{ contactEmail: formData.contactEmail, phone: formData.phone, address: formData.address }}
            errors={errors}
            onChange={updateField}
          />

          <LogoUpload 
            logoPreview={logoPreview}
            onLogoChange={handleLogoChange}
          />

          <TaxpayerInfoForm 
            taxpayerInfo={formData.taxpayerInfo}
            errors={errors}
            onChange={updateTaxpayerInfo}
          />

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
            <Button type="button" onClick={onCancel} variant="secondary" disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}