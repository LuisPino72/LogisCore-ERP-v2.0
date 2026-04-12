/**
 * Formulario de información fiscal del tenant.
 */

import type { TaxpayerInfo } from "../TenantForm";

interface TaxpayerInfoFormProps {
  taxpayerInfo: TaxpayerInfo;
  errors: Record<string, string>;
  onChange: (field: keyof TaxpayerInfo, value: string) => void;
}

export function TaxpayerInfoForm({ taxpayerInfo, errors, onChange }: TaxpayerInfoFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Información Fiscal</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">RIF</label>
          <input
            type="text"
            className={`input ${errors.rif ? "border-state-error" : ""}`}
            value={taxpayerInfo.rif}
            onChange={(e) => onChange("rif", e.target.value.toUpperCase())}
            placeholder="J-123456789"
          />
          {errors.rif && <p className="text-xs text-state-error mt-1">{errors.rif}</p>}
        </div>
        <div>
          <label className="label">Régimen</label>
          <select
            className="input"
            value={taxpayerInfo.regimen}
            onChange={(e) => onChange("regimen", e.target.value)}
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
            value={taxpayerInfo.razonSocial}
            onChange={(e) => onChange("razonSocial", e.target.value)}
            placeholder="Nombre de la empresa"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Dirección Fiscal</label>
          <input
            type="text"
            className="input"
            value={taxpayerInfo.direccionFiscal}
            onChange={(e) => onChange("direccionFiscal", e.target.value)}
            placeholder="Dirección fiscal completa"
          />
        </div>
      </div>
    </div>
  );
}