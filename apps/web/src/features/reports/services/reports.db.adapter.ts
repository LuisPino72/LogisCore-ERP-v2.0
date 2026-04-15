// Reports - Adaptador de base de datos para consultas de reportes
import { db, type SecurityAuditLogRecord, type InventoryLotRecord } from "@/lib/db/dexie";
import type { ReportsDb } from "./reports.service";
import type {
  BoxClosingSummary,
  BalanceSheetReport,
  FinanceReport,
  GrossProfit,
  KardexEntry,
  SalesByDay,
  SalesByProduct,
  CashFlowReport,
  CashFlowEntry
} from "../types/reports.types";

// Implementa la interfaz ReportsDb usando Dexie/IndexedDB
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

  async getFinanceReport(tenantId: string, startDate?: string, endDate?: string): Promise<FinanceReport[]> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const sales = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    const periodSales = sales.filter((s) => {
      const saleDate = new Date(s.createdAt ?? "");
      return saleDate >= start && saleDate <= end;
    });

    const purchases = await db.purchases
      .where("tenantId")
      .equals(tenantId)
      .and((p) => !p.deletedAt && (p.status === "confirmed" || p.status === "received" || p.status === "partial_received"))
      .toArray();

    const periodPurchases = purchases.filter((p) => {
      const purchaseDate = new Date(p.createdAt ?? "");
      return purchaseDate >= start && purchaseDate <= end;
    });

    const lotsMap = new Map<string, InventoryLotRecord>();
    const allLots = await db.inventory_lots.where("tenantId").equals(tenantId).toArray();
    for (const lot of allLots) {
      lotsMap.set(lot.localId, lot);
    }

    let totalSales = 0;
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    let ivaCollected = 0;
    let igtfCollected = 0;
    let cogs = 0;
    let purchasesConfirmed = 0;
    let purchasesReceived = 0;
    let totalTransactions = 0;
    let totalItems = 0;

    for (const sale of periodSales) {
      totalTransactions += 1;
      totalItems += sale.items?.length ?? 0;

      const netAmount = sale.subtotal - sale.discountTotal;
      subtotal += sale.subtotal;
      discountTotal += sale.discountTotal;
      taxTotal += sale.taxTotal;
      ivaCollected += sale.taxTotal;
      igtfCollected += sale.totalPaid - sale.total >= 0 ? (sale.totalPaid - sale.total) : 0;

      let saleCost = 0;
      for (const item of sale.items ?? []) {
        saleCost += (item.unitCost ?? 0) * item.qty;
      }

      totalSales += netAmount;
      cogs += saleCost;
    }

    for (const purchase of periodPurchases) {
      const purchaseTotal = purchase.total;
      if (purchase.status === "confirmed") {
        purchasesConfirmed += purchaseTotal;
      } else {
        purchasesReceived += purchaseTotal;
      }
    }

    const totalCost = cogs;
    const grossProfit = totalSales - totalCost;
    const operatingProfit = totalSales - totalCost - purchasesConfirmed;
    const profitMarginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    const avgExchangeRate = periodSales.length > 0
      ? periodSales.reduce((sum, s) => sum + (s.exchangeRate ?? 0), 0) / periodSales.length
      : 36.0;

    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    return [{
      period: periodKey,
      totalSales,
      subtotal,
      taxTotal,
      discountTotal,
      totalCost,
      cogs,
      purchasesConfirmed,
      purchasesReceived,
      grossProfit,
      operatingProfit,
      profitMarginPercent,
      ivaCollected,
      igtfCollected,
      exchangeRateUsed: avgExchangeRate || 36.0,
      totalTransactions,
      totalItems
    }];
  }

  async getBalanceSheet(tenantId: string, startDate?: string, endDate?: string): Promise<BalanceSheetReport[]> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);

    const lots = await db.inventory_lots
      .where("tenantId")
      .equals(tenantId)
      .and((l) => !l.deletedAt && l.status === "active")
      .toArray();

    let inventoryValue = 0;
    for (const lot of lots) {
      const qty = Number(lot.quantity);
      const cost = Number(lot.unitCost);
      const isWeighted = false;
      inventoryValue += isWeighted ? Number((qty * cost).toFixed(4)) : qty * cost;
    }

    const closings = await db.box_closings
      .where("tenantId")
      .equals(tenantId)
      .and((b) => !b.deletedAt && b.status === "closed")
      .sortBy("closedAt");

    let cash = 0;
    let lastClosingDate = "";
    if (closings.length > 0) {
const lastClosing = closings[closings.length - 1]!;
    lastClosingDate = lastClosing.closedAt ?? "";
    cash = Number(lastClosing.countedAmount ?? 0);
    }

    const salesSinceClosing = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    const salesAfterClosing = salesSinceClosing.filter((s) => {
      if (!lastClosingDate) return true;
      const saleDate = new Date(s.createdAt ?? "");
      const closingDate = new Date(lastClosingDate);
      return saleDate > closingDate;
    });

    for (const sale of salesAfterClosing) {
      cash += Number(sale.totalPaid);
    }

    const invoices = await db.invoices
      .where("tenantId")
      .equals(tenantId)
      .and((i) => !i.deletedAt && i.status === "issued")
      .toArray();

    let accountsReceivable = 0;
    let totalIvaCollected = 0;
    let totalIgtfCollected = 0;

    for (const invoice of invoices) {
      const payments = invoice.payments ?? [];
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
      if (totalPaid < invoice.total) {
        accountsReceivable += invoice.total - totalPaid;
      }
      totalIvaCollected += Number(invoice.taxTotal ?? 0);
      totalIgtfCollected += Number(invoice.igtfAmount ?? 0);
    }

    const purchases = await db.purchases
      .where("tenantId")
      .equals(tenantId)
      .and((p) => !p.deletedAt && (p.status === "received" || p.status === "confirmed"))
      .toArray();

    let accountsPayable = 0;
    for (const purchase of purchases) {
      accountsPayable += Number(purchase.total);
    }

    const taxObligations = totalIvaCollected + totalIgtfCollected;

    const financeReports = await this.getFinanceReport(tenantId, startDate, endDate);
    let retainedEarnings = 0;
    if (financeReports.length > 0 && financeReports[0]) {
      retainedEarnings = financeReports[0].operatingProfit;
    }

    const totalAssets = inventoryValue + cash + accountsReceivable;
    const totalLiabilities = accountsPayable + taxObligations;
    const totalEquity = retainedEarnings;
    const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;
    const liquidityIndex = totalLiabilities > 0 ? totalAssets / totalLiabilities : totalAssets > 0 ? 999 : 0;

    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    return [{
      period: periodKey,
      assets: {
        inventory: inventoryValue,
        cash: cash,
        accountsReceivable: accountsReceivable,
        total: totalAssets
      },
      liabilities: {
        accountsPayable: accountsPayable,
        taxObligations: taxObligations,
        total: totalLiabilities
      },
      equity: {
        retainedEarnings: retainedEarnings,
        total: totalEquity
      },
      balanceCheck: balanceCheck,
      liquidityIndex: liquidityIndex,
      exchangeRateUsed: 36.0
    }];
  }

  async getCashFlowReport(tenantId: string, startDate?: string, endDate?: string): Promise<CashFlowReport[]> {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    const allBoxClosings = await db.box_closings
      .where("tenantId")
      .equals(tenantId)
      .and((b) => !b.deletedAt && b.status === "closed")
      .sortBy("closedAt");

    let initialBalance = 0;
    if (allBoxClosings.length > 0) {
      const lastClosing = allBoxClosings[allBoxClosings.length - 1]!;
      initialBalance = Number(lastClosing.countedAmount ?? lastClosing.expectedAmount ?? 0);
    }

    const sales = await db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((s) => !s.deletedAt && s.status === "completed")
      .toArray();

    const filteredSales = sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt ?? "");
      return saleDate >= start && saleDate <= end;
    });

    let salesInflows = 0;
    let igtfInflows = 0;
    const cashFlowEntries: CashFlowEntry[] = [];

    for (const sale of filteredSales) {
      const payments = sale.payments ?? [];
      const saleDate = sale.createdAt ?? new Date().toISOString();
      const exchangeRate = Number(sale.exchangeRate ?? 36.0);

      for (const payment of payments) {
        const amount = Number(payment.amount ?? 0);
        const currency = (payment.currency as "VES" | "USD") ?? "VES";

        if (currency === "VES") {
          salesInflows += amount;
        } else {
          const amountInVes = amount * exchangeRate;
          salesInflows += amountInVes;
          const igtfAmount = amountInVes * 0.03;
          igtfInflows += igtfAmount;
        }

        cashFlowEntries.push({
          id: sale.localId + "_" + Math.random().toString(36).substring(7),
          type: "inflow",
          source: "sale",
          reference: sale.saleNumber ?? sale.localId,
          date: saleDate,
          amount: currency === "VES" ? amount : amount * exchangeRate,
          currency: currency,
          exchangeRate: exchangeRate
        });
      }
    }

    const invoices = await db.invoices
      .where("tenantId")
      .equals(tenantId)
      .and((i) => !i.deletedAt && i.status === "issued")
      .toArray();

    const filteredInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt ?? "");
      return invoiceDate >= start && invoiceDate <= end;
    });

    for (const invoice of filteredInvoices) {
      const payments = invoice.payments ?? [];
      const invoiceDate = invoice.createdAt ?? new Date().toISOString();
      const exchangeRate = Number(invoice.exchangeRate ?? 36.0);

      for (const payment of payments) {
        const amount = Number(payment.amount ?? 0);
        const currency = (payment.currency as "VES" | "USD") ?? "VES";

        if (currency === "VES") {
          salesInflows += amount;
        } else {
          const amountInVes = amount * exchangeRate;
          salesInflows += amountInVes;
          const igtfAmount = amountInVes * 0.03;
          igtfInflows += igtfAmount;
        }

        cashFlowEntries.push({
          id: invoice.localId + "_" + Math.random().toString(36).substring(7),
          type: "inflow",
          source: "invoice",
          reference: invoice.invoiceNumber ?? invoice.localId,
          date: invoiceDate,
          amount: currency === "VES" ? amount : amount * exchangeRate,
          currency: currency,
          exchangeRate: exchangeRate
        });
      }
    }

    const purchases = await db.purchases
      .where("tenantId")
      .equals(tenantId)
      .and((p) => !p.deletedAt && (p.status === "received" || p.status === "confirmed"))
      .toArray();

    const filteredPurchases = purchases.filter((purchase) => {
      const purchaseDate = new Date(purchase.createdAt ?? "");
      return purchaseDate >= start && purchaseDate <= end;
    });

    let purchaseOutflows = 0;
    for (const purchase of filteredPurchases) {
      const purchaseDate = purchase.createdAt ?? new Date().toISOString();
      const amount = Number(purchase.total ?? 0);
      const exchangeRate = Number(purchase.exchangeRate ?? 36.0);

      purchaseOutflows += amount * exchangeRate;

cashFlowEntries.push({
          id: purchase.localId + "_" + Math.random().toString(36).substring(7),
          type: "outflow",
          source: "purchase",
          reference: purchase.localId,
          date: purchaseDate,
          amount: amount * exchangeRate,
          currency: "VES",
          exchangeRate: exchangeRate
        });
    }

    const movements = await db.stock_movements
      .where("tenantId")
      .equals(tenantId)
      .and((m) => !m.deletedAt && m.movementType === "adjustment_out")
      .toArray();

    const filteredMovements = movements.filter((movement) => {
      const movementDate = new Date(movement.createdAt ?? "");
      return movementDate >= start && movementDate <= end;
    });

    let expenseOutflows = 0;
    for (const movement of filteredMovements) {
      const movementDate = movement.createdAt ?? new Date().toISOString();
      const quantity = Number(movement.quantity ?? 0);
      const unitCost = Number(movement.unitCost ?? 0);

      const isWeighted = false;
      const amount = isWeighted ? Number((quantity * unitCost).toFixed(4)) : quantity * unitCost;
      expenseOutflows += amount;

      cashFlowEntries.push({
        id: movement.localId + "_" + Math.random().toString(36).substring(7),
        type: "outflow",
        source: "adjustment",
        reference: movement.localId,
        date: movementDate,
        amount: amount,
        currency: "VES",
        exchangeRate: 1,
        quantity: quantity,
        isWeighted: isWeighted
      });
    }

    const igtfPaid = igtfInflows * 0.03;

    const totalInflows = salesInflows + igtfInflows;
    const totalOutflows = purchaseOutflows + igtfPaid + expenseOutflows;
    const netFlow = totalInflows - totalOutflows;
    const finalBalance = initialBalance + netFlow;

    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    return [{
      period: periodKey,
      initialBalance: initialBalance,
      inflows: {
        sales: salesInflows,
        igtf: igtfInflows,
        others: 0,
        total: totalInflows
      },
      outflows: {
        purchases: purchaseOutflows,
        igtfPaid: igtfPaid,
        expenses: expenseOutflows,
        total: totalOutflows
      },
      netFlow: netFlow,
      finalBalance: finalBalance,
      exchangeRateUsed: 36.0
    }];
  }
}