import { db, type SecurityAuditLogRecord } from "@/lib/db/dexie";
import type { ReportsDb } from "./reports.service";
import type {
  BoxClosingSummary,
  GrossProfit,
  KardexEntry,
  SalesByDay,
  SalesByProduct
} from "../types/reports.types";

export class DexieReportsDbAdapter implements ReportsDb {
  async listSalesByDay(tenantId: string): Promise<SalesByDay[]> {
    const sales = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    const byDate = new Map<string, SalesByDay>();

    for (const sale of sales) {
      const dateKey = (sale.createdAt ?? "").split("T")[0] || "unknown";
      const existing = byDate.get(dateKey) ?? {
        saleDate: dateKey,
        totalTransactions: 0,
        totalSubtotal: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalSales: 0,
        totalCollected: 0,
        voidedCount: 0,
        refundedCount: 0
      };

      existing.totalTransactions += 1;
      existing.totalSubtotal += sale.subtotal;
      existing.totalTax += sale.taxTotal;
      existing.totalDiscount += sale.discountTotal;
      existing.totalSales += sale.total;
      existing.totalCollected += sale.totalPaid;

      byDate.set(dateKey, existing);
    }

    return Array.from(byDate.values()).sort(
      (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );
  }

  async listSalesByProduct(tenantId: string): Promise<SalesByProduct[]> {
    const sales = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    const byProduct = new Map<string, SalesByProduct>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = byProduct.get(item.productLocalId) ?? {
          productLocalId: item.productLocalId,
          totalLineItems: 0,
          totalQty: 0,
          totalAmount: 0
        };

        existing.totalLineItems += 1;
        existing.totalQty += item.qty;
        existing.totalAmount += item.qty * item.unitPrice;

        byProduct.set(item.productLocalId, existing);
      }
    }

    return Array.from(byProduct.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async listKardex(tenantId: string, warehouseLocalId?: string): Promise<KardexEntry[]> {
    const movements = await db.stock_movements
      .where("tenantId")
      .equals(tenantId)
      .and((m) => !m.deletedAt)
      .toArray();

    const filteredMovements = warehouseLocalId
      ? movements.filter((m) => m.warehouseLocalId === warehouseLocalId)
      : movements;

    const byProductWarehouse = new Map<string, KardexEntry>();

    for (const m of filteredMovements) {
      const key = `${m.productLocalId}-${m.warehouseLocalId}`;
      const existing = byProductWarehouse.get(key) ?? {
        productLocalId: m.productLocalId,
        warehouseLocalId: m.warehouseLocalId,
        warehouseName: "",
        productName: "",
        totalIn: 0,
        totalOut: 0,
        currentBalance: 0
      };

      const isIn = [
        "purchase_in",
        "adjustment_in",
        "production_in",
        "transfer_in",
        "count_adjustment"
      ].includes(m.movementType);

      if (isIn) {
        existing.totalIn += m.quantity;
      } else {
        existing.totalOut += m.quantity;
      }
      existing.currentBalance += isIn ? m.quantity : -m.quantity;

      byProductWarehouse.set(key, existing);
    }

    return Array.from(byProductWarehouse.values());
  }

  async listGrossProfit(tenantId: string): Promise<GrossProfit[]> {
    const sales = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    return sales.map((s) => {
      let totalCost = 0;
      for (const item of s.items) {
        totalCost += (item.unitCost ?? 0) * item.qty;
      }
      const grossProfit = s.total - totalCost;
      const profitMarginPercent = s.total > 0 ? (grossProfit / s.total) * 100 : 0;

      return {
        saleLocalId: s.localId,
        createdAt: s.createdAt,
        subtotal: s.subtotal,
        taxTotal: s.taxTotal,
        saleTotal: s.total,
        totalCost,
        grossProfit,
        profitMarginPercent: Math.round(profitMarginPercent * 100) / 100
      };
    });
  }

  async listBoxClosings(tenantId: string): Promise<BoxClosingSummary[]> {
    const closings = await db.box_closings
      .where("tenantId")
      .equals(tenantId)
      .and((b) => !b.deletedAt)
      .sortBy("closedAt");

    return closings.map((b) => ({
      localId: b.localId,
      warehouseLocalId: b.warehouseLocalId,
      warehouseName: "",
      openedAt: b.openedAt,
      closedAt: b.closedAt ?? "",
      openingAmount: b.openingAmount,
      expectedAmount: b.expectedAmount ?? 0,
      countedAmount: b.countedAmount ?? 0,
      differenceAmount: b.differenceAmount ?? 0,
      salesCount: b.salesCount ?? 0,
      status: b.status,
      closedBy: b.closedBy ?? ""
    }));
  }

  async createAuditLog(log: Omit<SecurityAuditLogRecord, "localId">): Promise<void> {
    await db.security_audit_log.put({
      localId: crypto.randomUUID(),
      ...log
    });
  }

  async listAuditLogs(tenantId: string, eventType?: string): Promise<SecurityAuditLogRecord[]> {
    const logs = await db.security_audit_log
      .where("tenantId")
      .equals(tenantId)
      .toArray();

    if (eventType) {
      return logs.filter((logEntry) => logEntry.eventType === eventType).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return logs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}