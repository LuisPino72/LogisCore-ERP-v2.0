import { useState, useEffect } from "react";
import { taxRuleService } from "@/features/core/services/core.service.instance";

export interface TaxRates {
  iva: number;
  igtf: number;
}

/**
 * Hook para obtener las tasas de impuestos activas para un tenant específico.
 * Si no se encuentran tasas en la base de datos, retorna defaults seguros (16% IVA, 3% IGTF).
 */
export function useTaxRates(tenantId: string): TaxRates {
  const [rates, setRates] = useState<TaxRates>({ iva: 0.16, igtf: 0.03 });

  useEffect(() => {
    if (!tenantId) return;
    
    // Skip Dexie in development (avoid compound index warnings)
    if (import.meta.env.DEV) {
      setRates({ iva: 0.16, igtf: 0.03 });
      return;
    }

    // Fetch IVA
    taxRuleService
      .getRateByType(tenantId, "iva")
      .then(r => {
        if (r.ok && typeof r.data === "number") {
          setRates(prev => ({ ...prev, iva: r.data }));
        }
      });

    // Fetch IGTF
    taxRuleService
      .getRateByType(tenantId, "igtf")
      .then(r => {
        if (r.ok && typeof r.data === "number") {
          setRates(prev => ({ ...prev, igtf: r.data }));
        }
      });
  }, [tenantId]);

  return rates;
}
