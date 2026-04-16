/**
 * Servicio de Reglas Fiscales.
 * Proporciona acceso centralizado a las tasas de impuestos configuradas en el sistema.
 * Sigue el principio de SSoT (Single Source of Truth).
 */

import { createAppError, err, ok, type AppError, type Result } from "@logiscore/core";
import type { TaxRule } from "@/features/invoicing/types/invoicing.types";

/**
 * Interfaz del adaptador de base de datos para reglas fiscales.
 */
export interface TaxRuleDb {
  getActiveTaxRules(tenantId: string): Promise<TaxRule[]>;
}

export interface TaxRuleService {
  /**
   * Obtiene la tasa de un impuesto específico basado en su tipo (iva, islr, igtf).
   * Retorna el valor decimal (ej. 0.03 para 3%).
   */
  getRateByType(tenantId: string, type: "iva" | "islr" | "igtf"): Promise<Result<number, AppError>>;
  
  /**
   * Lista todas las reglas fiscales activas para el tenant.
   */
  listActiveRules(tenantId: string): Promise<Result<TaxRule[], AppError>>;
}

interface CreateTaxRuleServiceDependencies {
  db: TaxRuleDb;
}

export const createTaxRuleService = ({
  db,
}: CreateTaxRuleServiceDependencies): TaxRuleService => {
  
  const getRateByType: TaxRuleService["getRateByType"] = async (tenantId, type) => {
    const rules = await db.getActiveTaxRules(tenantId);
    const rule = rules.find((r) => r.type === type && r.isActive);
    
    if (!rule) {
      return err(
        createAppError({
          code: "TAX_RULE_NOT_FOUND",
          message: `No se encontró una regla fiscal activa para el tipo: ${type}.`,
          retryable: false,
          context: { tenantId, type }
        })
      );
    }
    
    return ok(rule.rate);
  };

  const listActiveRules: TaxRuleService["listActiveRules"] = async (tenantId) => {
    try {
      const rules = await db.getActiveTaxRules(tenantId);
      return ok(rules.filter(r => r.isActive));
    } catch (error) {
      return err(
        createAppError({
          code: "TAX_RULES_FETCH_FAILED",
          message: "Error al obtener las reglas fiscales.",
          retryable: true,
          cause: error
        })
      );
    }
  };

  return {
    getRateByType,
    listActiveRules
  };
};
