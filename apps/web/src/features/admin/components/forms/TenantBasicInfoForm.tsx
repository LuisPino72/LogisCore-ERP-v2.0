/**
 * Formulario de información básica del tenant.
 */

import type { FormData } from "../TenantForm";
import { VALIDATION_RULES, FormField, Input } from "@/common";

interface TenantBasicInfoFormProps {
  formData: FormData;
  errors: Record<string, string>;
  isNew: boolean;
  onChange: (field: keyof FormData, value: string | number | boolean) => void;
}

export function TenantBasicInfoForm({ formData, errors, isNew, onChange }: TenantBasicInfoFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Básica</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre de la Empresa" htmlFor="tenantName" required error={errors.name}>
          <Input
            id="tenantName"
            type="text"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
          />
          <p className="text-xs text-content-secondary mt-1">{formData.name.length}/{VALIDATION_RULES.MAX_TEXT_LENGTH}</p>
        </FormField>
        {isNew && (
          <FormField label="Slug (URL)" htmlFor="tenantSlug" error={errors.slug}>
            <Input
              id="tenantSlug"
              type="text"
              value={formData.slug}
              onChange={(e) => onChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={VALIDATION_RULES.SLUG_MAX_LENGTH}
            />
            <p className="text-xs text-content-secondary mt-1">{formData.slug.length}/{VALIDATION_RULES.SLUG_MAX_LENGTH}</p>
          </FormField>
        )}
      </div>
    </div>
  );
}