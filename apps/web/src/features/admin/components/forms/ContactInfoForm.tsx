/**
 * Formulario de información de contacto.
 */

import { VALIDATION_RULES, FormField, Input } from "@/common";

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
        <FormField label="Email de Contacto" htmlFor="contactEmail" error={errors.contactEmail}>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => onChange("contactEmail", e.target.value)}
            placeholder="contacto@empresa.com"
          />
        </FormField>
        <FormField label="Teléfono" htmlFor="contactPhone" error={errors.phone}>
          <Input
            id="contactPhone"
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="04121234567"
            maxLength={VALIDATION_RULES.PHONE_LENGTH}
          />
        </FormField>
        <div className="col-span-2">
          <FormField label="Dirección" htmlFor="contactAddress">
            <Input
              id="contactAddress"
              type="text"
              value={formData.address}
              onChange={(e) => onChange("address", e.target.value)}
              maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH * 2}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}