/**
 * Formulario de información del propietario (owner).
 */

import { VALIDATION_RULES } from "@/common";
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
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className={`input ${errors.ownerEmail ? "border-red-500" : ""}`}
              value={formData.ownerEmail}
              onChange={(e) => onChange("ownerEmail", e.target.value)}
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
              onChange={(e) => onChange("ownerFullName", e.target.value)}
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
              onChange={(e) => onChange("ownerPassword", e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            {errors.ownerPassword && <p className="text-xs text-red-500 mt-1">{errors.ownerPassword}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Propietario (Owner)</h3>
      <select
        className="input"
        value={formData.ownerUserId}
        onChange={(e) => onChange("ownerUserId", e.target.value)}
      >
        <option value="">Seleccionar owner...</option>
        {securityUsers.map(u => (
          <option key={u.userId} value={u.userId}>{u.email}</option>
        ))}
      </select>
    </div>
  );
}