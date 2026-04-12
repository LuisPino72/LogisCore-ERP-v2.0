import { createInvoiceRangeService } from "./invoice-range.service";
import { invoiceRangeDb } from "./invoice-range.db.adapter";

export const invoiceRangeService = createInvoiceRangeService({
  db: invoiceRangeDb
});