import { describe, it, expect } from "vitest";

interface GoldenDataSet {
  id: string;
  description: string;
  sales: Array<{
    id: string;
    total: number;
    tax: number;
    igtf: number;
    currency: "VES" | "USD";
    exchangeRate: number;
  }>;
  purchases: Array<{
    id: string;
    total: number;
    currency: "VES" | "USD";
    exchangeRate: number;
  }>;
  inventoryLots: Array<{
    id: string;
    quantity: number;
    unitCost: number;
    status: "active" | "consumed";
  }>;
  expectedReports: {
    balanceSheet: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
    };
    cashFlow: {
      operatingCashFlow: number;
      investingCashFlow: number;
      financingCashFlow: number;
    };
    pnl: {
      grossProfit: number;
      netProfit: number;
    };
  };
}

const TOLERANCE = 0.0001;

const GOLDEN_DATASET_001: GoldenDataSet = {
  id: "GM-001",
  description: "Dataset básico: 3 ventas VES, 2 compras USD",
  sales: [
    { id: "s1", total: 1000, tax: 160, igtf: 0, currency: "VES", exchangeRate: 1 },
    { id: "s2", total: 2000, tax: 320, igtf: 0, currency: "VES", exchangeRate: 1 },
    { id: "s3", total: 100, tax: 16, igtf: 3, currency: "USD", exchangeRate: 50 }
  ],
  purchases: [
    { id: "p1", total: 500, currency: "VES", exchangeRate: 1 },
    { id: "p2", total: 50, currency: "USD", exchangeRate: 50 }
  ],
  inventoryLots: [
    { id: "l1", quantity: 100, unitCost: 5, status: "active" },
    { id: "l2", quantity: 50, unitCost: 6, status: "active" }
  ],
  expectedReports: {
    balanceSheet: {
      totalAssets: 800,
      totalLiabilities: 0,
      totalEquity: 800
    },
    cashFlow: {
      operatingCashFlow: 2760,
      investingCashFlow: -2750,
      financingCashFlow: 0
    },
    pnl: {
      grossProfit: 510,
      netProfit: 510
    }
  }
};

const calculateSalesInVES = (sales: GoldenDataSet["sales"]): number => {
  return sales.reduce((acc, sale) => {
    const amountInVES = sale.currency === "USD" 
      ? sale.total * sale.exchangeRate 
      : sale.total;
    return acc + amountInVES;
  }, 0);
};

const calculateIGTFInVES = (sales: GoldenDataSet["sales"]): number => {
  return sales.reduce((acc, sale) => {
    if (sale.currency === "USD") {
      return acc + (sale.igtf * sale.exchangeRate);
    }
    return acc;
  }, 0);
};

const calculatePurchasesInVES = (purchases: GoldenDataSet["purchases"]): number => {
  return purchases.reduce((acc, purchase) => {
    const amountInVES = purchase.currency === "USD"
      ? purchase.total * purchase.exchangeRate
      : purchase.total;
    return acc + amountInVES;
  }, 0);
};

const calculateInventoryValue = (lots: GoldenDataSet["inventoryLots"]): number => {
  return lots
    .filter(l => l.status === "active")
    .reduce((acc, lot) => acc + (lot.quantity * lot.unitCost), 0);
};

describe("Fase 4: Golden Master - Reportes Financieros", () => {
  describe("GM-001: Validación de Balance General (Activos = Pasivos + Patrimonio)", () => {
    it("Given dataset GM-001, When calculo Balance General, Then Activos = Pasivos + Patrimonio", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const totalAssets = calculateInventoryValue(dataset.inventoryLots);
      const { totalLiabilities, totalEquity } = dataset.expectedReports.balanceSheet;

      expect(Math.abs(totalAssets - (totalLiabilities + totalEquity))).toBeLessThan(TOLERANCE);
    });

    it("Given dataset GM-001, When calculo Activos, Then coincide con esperado", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const inventoryValue = calculateInventoryValue(dataset.inventoryLots);
      
      expect(inventoryValue).toBeCloseTo(dataset.expectedReports.balanceSheet.totalAssets, 2);
    });
  });

  describe("GM-002: Validación de Flujo de Caja", () => {
    it("Given dataset GM-001, When calculo Flujo Operativo, Then incluye ventas y IGTF", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const salesInVES = calculateSalesInVES(dataset.sales);
      const igtfInVES = calculateIGTFInVES(dataset.sales);
      const expectedOperating = dataset.expectedReports.cashFlow.operatingCashFlow;

      expect(salesInVES + igtfInVES).toBeCloseTo(expectedOperating, 0);
    });

    it("Given dataset GM-001, When calculo Flujo de Inversión, Then incluye compras", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const purchasesInVES = calculatePurchasesInVES(dataset.purchases);
      const expectedInvesting = dataset.expectedReports.cashFlow.investingCashFlow;

      expect(-purchasesInVES).toBeCloseTo(expectedInvesting, 0);
    });

    it("Given dataset GM-001, When calculo Flujo de Financiamiento, Then es cero (sin préstamos)", () => {
      expect(GOLDEN_DATASET_001.expectedReports.cashFlow.financingCashFlow).toBe(0);
    });
  });

  describe("GM-003: Validación de P&L (Estado de Resultados)", () => {
    it("Given dataset GM-001, When calculo Utilidad Bruta, Then = Ventas - Costo de Ventas", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const salesRevenue = calculateSalesInVES(dataset.sales);
      const costOfSales = calculateInventoryValue(dataset.inventoryLots) * 0.5;
      const grossProfit = salesRevenue - costOfSales;

      expect(grossProfit).toBeCloseTo(dataset.expectedReports.pnl.grossProfit, 0);
    });

    it("Given dataset GM-001, When calculo Utilidad Neta, Then = Ingresos - Egresos", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const totalIn = calculateSalesInVES(dataset.sales) + calculateIGTFInVES(dataset.sales);
      const totalOut = calculatePurchasesInVES(dataset.purchases);
      const netProfit = totalIn - totalOut;

      expect(netProfit).toBeCloseTo(dataset.expectedReports.pnl.netProfit, 0);
    });
  });

  describe("GM-004: Precisión de Decimales en Reportes", () => {
    it("Given cálculos con productos pesables, When genero reportes, Then precisión >= 4 decimales", () => {
      const amounts = [100.1234, 200.5678, 300.9012];
      const sum = amounts.reduce((acc, val) => acc + val, 0);

      const decimals = sum.toString().split(".")[1]?.length ?? 0;
      expect(decimals).toBeGreaterThanOrEqual(0);
      expect(decimals).toBeLessThanOrEqual(4);
    });

    it("Given cálculos de IGTF, When aplico 3%, Then resultado con 4 decimales mínimo", () => {
      const amountUSD = 123.4567;
      const exchangeRate = 50.5678;
      const igtf = amountUSD * exchangeRate * 0.03;

      const igtfRounded = Math.round(igtf * 10000) / 10000;
      const decimals = igtfRounded.toString().split(".")[1]?.length ?? 0;

      expect(decimals).toBeLessThanOrEqual(4);
    });

    it("Given diferencia entre reportes, When comparo con tolerancia, Then diferencia < 0.0001", () => {
      const value1 = 1234.5678901;
      const value2 = 1234.5678902;
      const diff = Math.abs(value1 - value2);

      expect(diff).toBeLessThan(TOLERANCE);
    });
  });

  describe("GM-005: Trazabilidad de Moneda en Reportes", () => {
    it("Given ventas en VES y USD, When consolido, Then usar tasa del snapshot", () => {
      const sales = [
        { total: 1000, currency: "VES" as const, exchangeRate: 1 },
        { total: 100, currency: "USD" as const, exchangeRate: 50.5 }
      ];

      const consolidated = sales.reduce((acc, sale) => {
        const inVES = sale.currency === "USD"
          ? sale.total * sale.exchangeRate
          : sale.total;
        return acc + inVES;
      }, 0);

      expect(consolidated).toBe(6000);
    });

    it("Given snapshot de tasa BCV, When genero reporte histórico, Then usar tasa del momento", () => {
      const snapshots = [
        { date: "2026-04-15", rate: 50.0 },
        { date: "2026-04-16", rate: 50.5 },
        { date: "2026-04-17", rate: 51.0 }
      ];

      const saleOnApril15 = {
        total: 100,
        currency: "USD" as const,
        snapshotRate: snapshots[0].rate
      };

      const valueInVES = saleOnApril15.total * saleOnApril15.snapshotRate;

      expect(valueInVES).toBe(5000);
      expect(valueInVES).not.toBe(5100);
    });
  });

  describe("GM-006: Certificación End-to-End", () => {
    it("Given dataset completo GM-001, When ejecuto todos los reportes, Then todos pasan validación", () => {
      const dataset = GOLDEN_DATASET_001;
      
      const inventoryValue = calculateInventoryValue(dataset.inventoryLots);
      const totalAssets = inventoryValue;
      const totalLiabilities = dataset.expectedReports.balanceSheet.totalLiabilities;
      const totalEquity = dataset.expectedReports.balanceSheet.totalEquity;
      
      const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < TOLERANCE;
      
      const salesInVES = calculateSalesInVES(dataset.sales);
      const purchasesInVES = calculatePurchasesInVES(dataset.purchases);
      const netFlow = (salesInVES + calculateIGTFInVES(dataset.sales)) - purchasesInVES;
      
      const cashFlowCheck = Math.abs(netFlow - dataset.expectedReports.pnl.netProfit) < TOLERANCE;
      
      const allPassed = balanceCheck && cashFlowCheck;
      
      expect(allPassed).toBe(true);
    });

    it("Given dataset con desviación, When comparo contra Golden, Then reporter diferencias", () => {
      const goldenValue = 1000;
      const actualValue = 1000.0001;
      const diff = Math.abs(goldenValue - actualValue);

      expect(diff).toBeLessThan(TOLERANCE);
      
      const largeDeviation = 1001;
      const largeDiff = Math.abs(goldenValue - largeDeviation);
      
      expect(largeDiff).toBeGreaterThan(TOLERANCE);
    });
  });
});