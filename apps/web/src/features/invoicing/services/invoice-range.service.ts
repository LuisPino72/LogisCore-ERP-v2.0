import {
  createAppError,
  err,
  ok,
  type AppError,
  type Result
} from "@logiscore/core";
import type { InvoiceRangeRecord } from "@/lib/db/dexie";

export interface InvoiceRangeDb {
  getActiveRange(tenantId: string): Promise<InvoiceRangeRecord | undefined>;
  updateRange(tenantId: string, localId: string, patch: Partial<InvoiceRangeRecord>): Promise<void>;
}

export interface InvoiceRangeService {
  reserveNextNumber(tenantId: string): Promise<Result<{ invoiceNumber: string; controlNumber: string }, AppError>>;
}

interface CreateInvoiceRangeServiceDependencies {
  db: InvoiceRangeDb;
}

export const createInvoiceRangeService = ({
  db
}: CreateInvoiceRangeServiceDependencies): InvoiceRangeService => {
  const formatNumber = (num: number, padding: number = 8): string => {
    return String(num).padStart(padding, "0");
  };

  const reserveNextNumber: InvoiceRangeService["reserveNextNumber"] = async (tenantId: string) => {
    const range = await db.getActiveRange(tenantId);
    
    if (!range) {
      return err(
        createAppError({
          code: "INVOICE_RANGE_NOT_FOUND",
          message: "No existe talonario activo. Configure uno en Config Tab.",
          retryable: false
        })
      );
    }

    const nextNumber = range.currentNumber + 1;
    
    if (nextNumber > range.endNumber) {
      return err(
        createAppError({
          code: "INVOICE_RANGE_EXHAUSTED",
          message: `Talonario agotado. Rango: ${range.prefix}${formatNumber(range.startNumber)} - ${range.prefix}${formatNumber(range.endNumber)}`,
          retryable: false,
          context: {
            currentNumber: range.currentNumber,
            endNumber: range.endNumber
          }
        })
      );
    }

    const invoiceNumber = `${range.prefix}${formatNumber(nextNumber)}`;
    const controlNumber = `${range.controlNumberPrefix}${formatNumber(nextNumber)}`;

    await db.updateRange(tenantId, range.localId, {
      currentNumber: nextNumber,
      updatedAt: new Date().toISOString()
    });

    return ok({ invoiceNumber, controlNumber });
  };

  return {
    reserveNextNumber
  };
};