/**
 * Formulario de información básica del tenant.
 */

import type { FormData } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";

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
        <div>
          <label className="label">Nombre de la Empresa</label>
          <input
            type="text"
            className={`input ${errors.name ? "border-red-500" : ""}`}
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
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
              onChange={(e) => onChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={VALIDATION_RULES.SLUG_MAX_LENGTH}
              required
            />
            {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
            <p className="text-xs text-content-secondary mt-1">{formData.slug.length}/{VALIDATION_RULES.SLUG_MAX_LENGTH}</p>
          </div>
        )}
      </div>
    </div>
  );
}