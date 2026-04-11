/**
 * Formulario de información del propietario (owner).
 */

import { VALIDATION_RULES, FormField, Input, Select } from "@/common";
import type { SecurityUser } from "../../types/admin.types";

interface OwnerSectionProps {
  formData: { ownerEmail: string; ownerFullName: string; ownerPassword: string; ownerUserId: string };
  errors: Record<string, string>;
  isNew: boolean;
  securityUsers: SecurityUser[];
  onChange: (field: string, value: string | number | boolean) => void;
}

export function OwnerSection({ formData, errors, isNew, securityUsers, onChange }: OwnerSectionProps) {
  if (isNew) {
    return (
      <div>
        <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" htmlFor="ownerEmail" required error={errors.ownerEmail}>
            <Input
              id="ownerEmail"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => onChange("ownerEmail", e.target.value)}
              placeholder="owner@empresa.com"
            />
          </FormField>
          <FormField label="Nombre Completo" htmlFor="ownerFullName" required error={errors.ownerFullName}>
            <Input
              id="ownerFullName"
              type="text"
              value={formData.ownerFullName}
              onChange={(e) => onChange("ownerFullName", e.target.value)}
              placeholder="Juan Pérez"
              maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
            />
          </FormField>
          <FormField label="Contraseña" htmlFor="ownerPassword" required error={errors.ownerPassword}>
            <Input
              id="ownerPassword"
              type="password"
              value={formData.ownerPassword}
              onChange={(e) => onChange("ownerPassword", e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </FormField>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
      <FormField label="" htmlFor="ownerUserId">
        <Select
          value={formData.ownerUserId}
          onChange={(value) => onChange("ownerUserId", String(value))}
          options={securityUsers.map(u => ({ value: u.userId, label: u.email }))}
          placeholder="Seleccionar owner..."
        />
      </FormField>
    </div>
  );
}