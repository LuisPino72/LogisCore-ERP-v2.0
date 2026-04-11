/**
 * Formulario de información de contacto.
 */

import { VALIDATION_RULES } from "@/common";

interface ContactInfoFormProps {
  formData: { contactEmail: string; phone: string; address: string };
  errors: Record<string, string>;
  onChange: (field: string, value: string | number | boolean) => void;
}

export function ContactInfoForm({ formData, errors, onChange }: ContactInfoFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información de Contacto</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email de Contacto</label>
          <input
            type="email"
            className={`input ${errors.contactEmail ? "border-red-500" : ""}`}
            value={formData.contactEmail}
            onChange={(e) => onChange("contactEmail", e.target.value)}
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
            onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
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
            onChange={(e) => onChange("address", e.target.value)}
            maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH * 2}
          />
        </div>
      </div>
    </div>
  );
}