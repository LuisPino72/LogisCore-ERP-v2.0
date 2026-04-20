/**
 * Formulario de información fiscal del tenant.
 */

import type { TaxpayerInfo } from "../TenantForm";
import { Input } from "@/common/components/FormField";

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
          <Input
            type="text"
            error={errors.rif || ""}
            value={taxpayerInfo.rif}
            onChange={(value) => onChange("rif", value.toUpperCase())}
            placeholder="J-123456789"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Razón Social</label>
          <Input
            type="text"
            value={taxpayerInfo.razonSocial}
            onChange={(value) => onChange("razonSocial", value)}
            placeholder="Nombre de la empresa"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Dirección Fiscal</label>
          <Input
            type="text"
            value={taxpayerInfo.direccionFiscal}
            onChange={(value) => onChange("direccionFiscal", value)}
            placeholder="Dirección fiscal completa"
          />
        </div>
      </div>
    </div>
  );
}