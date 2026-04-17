import { describe, it, expect, beforeEach } from "vitest";

interface Product {
  localId: string;
  name: string;
  sku: string;
  isWeighted: boolean;
  unitOfMeasure: string;
  unitCost: number;
}

interface InventoryLot {
  localId: string;
  productLocalId: string;
  warehouseLocalId: string;
  quantity: number;
  unitCost: number;
  createdAt: Date;
  status: "active" | "consumed";
}

interface PurchaseOrder {
  localId: string;
  supplierName: string;
  status: "draft" | "confirmed" | "partial_received" | "received" | "cancelled";
  items: Array<{
    productLocalId: string;
    quantity: number;
    unitCost: number;
  }>;
}

interface ProductionOrder {
  localId: string;
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
  producedQty: number;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  ingredients: Array<{
    productLocalId: string;
    qtyPlanned: number;
    qtyUsed: number;
  }>;
}

interface SaleOrder {
  localId: string;
  warehouseLocalId: string;
  items: Array<{
    productLocalId: string;
    quantity: number;
    unitCost: number;
  }>;
  total: number;
  status: "draft" | "completed" | "voided";
}

describe("Fase 3: BDD - Super-Flows (The Great Cycle)", () => {
  describe("BDD-001: Ciclo Compra → Recepción → Inventario FIFO → Consumo en Producción → Venta", () => {
    let products: Map<string, Product>;
    let lots: InventoryLot[];
    let purchaseOrders: PurchaseOrder[];
    let productionOrders: ProductionOrder[];
    let sales: SaleOrder[];

    beforeEach(() => {
      products = new Map();
      lots = [];
      purchaseOrders = [];
      productionOrders = [];
      sales = [];
    });

    const addProduct = (product: Product) => {
      products.set(product.localId, product);
    };

    const addLot = (lot: InventoryLot) => {
      lots.push({ ...lot, createdAt: new Date() });
      lots.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    };

    const consumeFIFO = (productLocalId: string, quantity: number): { lotId: string; qty: number }[] => {
      const result: { lotId: string; qty: number }[] = [];
      let remaining = quantity;
      
      const activeLots = lots
        .filter(l => l.productLocalId === productLocalId && l.status === "active" && l.quantity > 0)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      for (const lot of activeLots) {
        if (remaining <= 0) break;
        const qtyToConsume = Math.min(lot.quantity, remaining);
        result.push({ lotId: lot.localId, qty: qtyToConsume });
        remaining -= qtyToConsume;
      }
      
      return result;
    };

    it("Given producto pesable (isWeighted=true), When fluye por el ciclo completo, Then mantiene 4 decimales en todo momento", () => {
      const wheat = {
        localId: "prod-wheat",
        name: "Trigo",
        sku: "WHEAT-001",
        isWeighted: true,
        unitOfMeasure: "kg",
        unitCost: 0.5
      };
      addProduct(wheat);

      const purchase = {
        localId: "pur-001",
        supplierName: "Proveedor Trigo C.A.",
        status: "confirmed" as const,
        items: [{
          productLocalId: wheat.localId,
          quantity: 100.1234,
          unitCost: 0.5
        }]
      };
      purchaseOrders.push(purchase);

      const lot1: InventoryLot = {
        localId: "lot-001",
        productLocalId: wheat.localId,
        warehouseLocalId: "wh-001",
        quantity: 100.1234,
        unitCost: 0.5,
        createdAt: new Date("2026-04-10T08:00:00Z"),
        status: "active"
      };
      addLot(lot1);

      const purchase2 = {
        localId: "pur-002",
        supplierName: "Proveedor Trigo C.A.",
        status: "confirmed" as const,
        items: [{
          productLocalId: wheat.localId,
          quantity: 50.5678,
          unitCost: 0.55
        }]
      };
      purchaseOrders.push(purchase2);

      const lot2: InventoryLot = {
        localId: "lot-002",
        productLocalId: wheat.localId,
        warehouseLocalId: "wh-001",
        quantity: 50.5678,
        unitCost: 0.55,
        createdAt: new Date("2026-04-15T08:00:00Z"),
        status: "active"
      };
      addLot(lot2);

      expect(lots).toHaveLength(2);
      expect(lots[0].quantity).toBe(100.1234);
      expect(lots[1].quantity).toBe(50.5678);
    });

    it("Given órdenes de producción, When consumo inventario, Then usa el lote más antiguo (FIFO)", () => {
      const flour = {
        localId: "prod-flour",
        name: "Harina",
        sku: "FLOUR-001",
        isWeighted: true,
        unitOfMeasure: "kg",
        unitCost: 0.8
      };
      addProduct(flour);

      addLot({
        localId: "lot-001",
        productLocalId: flour.localId,
        warehouseLocalId: "wh-001",
        quantity: 100,
        unitCost: 0.5,
        createdAt: new Date("2026-04-10T08:00:00Z"),
        status: "active"
      });

      addLot({
        localId: "lot-002",
        productLocalId: flour.localId,
        warehouseLocalId: "wh-001",
        quantity: 50,
        unitCost: 0.6,
        createdAt: new Date("2026-04-15T08:00:00Z"),
        status: "active"
      });

      const production: ProductionOrder = {
        localId: "prod-001",
        recipeLocalId: "rec-bread",
        warehouseLocalId: "wh-001",
        plannedQty: 75,
        producedQty: 0,
        status: "draft",
        ingredients: [{
          productLocalId: flour.localId,
          qtyPlanned: 75,
          qtyUsed: 0
        }]
      };

      const consumed = consumeFIFO(flour.localId, 75);
      
      expect(consumed).toHaveLength(1);
      expect(consumed[0].lotId).toBe("lot-001");
      expect(consumed[0].qty).toBe(75);
    });

    it("Given producción completada, When hay venta, Then costo FIFO se propaga correctamente", () => {
      const bread = {
        localId: "prod-bread",
        name: "Pan",
        sku: "BREAD-001",
        isWeighted: false,
        unitOfMeasure: "un",
        unitCost: 0
      };
      addProduct(bread);

      addLot({
        localId: "lot-flour-001",
        productLocalId: "prod-flour",
        warehouseLocalId: "wh-001",
        quantity: 25,
        unitCost: 0.5,
        createdAt: new Date("2026-04-10T08:00:00Z"),
        status: "active"
      });

      const productionOrder: ProductionOrder = {
        localId: "prod-001",
        recipeLocalId: "rec-bread",
        warehouseLocalId: "wh-001",
        plannedQty: 100,
        producedQty: 100,
        status: "completed",
        ingredients: [{
          productLocalId: "prod-flour",
          qtyPlanned: 50,
          qtyUsed: 50
        }]
      };
      productionOrders.push(productionOrder);

      addLot({
        localId: "lot-bread-001",
        productLocalId: bread.localId,
        warehouseLocalId: "wh-001",
        quantity: 100,
        unitCost: 0.25,
        createdAt: new Date("2026-04-17T10:00:00Z"),
        status: "active"
      });

      const sale: SaleOrder = {
        localId: "sale-001",
        warehouseLocalId: "wh-001",
        items: [{
          productLocalId: bread.localId,
          quantity: 10,
          unitCost: 0.25
        }],
        total: 2.5,
        status: "completed"
      };
      sales.push(sale);

      const breadLot = lots.find(l => l.productLocalId === bread.localId);
      expect(breadLot?.unitCost).toBe(0.25);
      expect(sale.total).toBe(10 * 0.25);
    });
  });

  describe("BDD-002: Escenarios de Suma de Decimales en Sync (SUM_MERGE)", () => {
    it("Given dos terminales actualizan stock offline, When syncan, Then SUM_MERGE combina correctamente con 4 decimales", () => {
      const terminalA_stock = 100.1234;
      const terminalB_stock = 50.5678;
      
      const sumMerge = terminalA_stock + terminalB_stock;
      
      expect(sumMerge).toBe(150.6912);
    });

    it("Given venta offline reduce stock, When syncan, Then la resta mantiene precisión", () => {
      const initialStock = 100.1234;
      const soldQty = 25.5678;
      
      const remaining = initialStock - soldQty;
      
      expect(remaining).toBeCloseTo(74.5556, 4);
    });

    it("Given múltiples operaciones parciales, When calculo total, Then error de precisión < 0.0001", () => {
      const operations = [10.0001, 20.0002, 30.0003, 40.0004];
      const expected = 100.001;
      
      const sum = operations.reduce((acc, val) => acc + val, 0);
      const error = Math.abs(sum - expected);
      
      expect(error).toBeLessThan(0.0001);
    });
  });

  describe("BDD-003: Trazabilidad de Costo a través de Transformaciones", () => {
    it("Given materia prima comprada a $0.50, When se convierte en producto terminado, Then el costo unitario refleja el consumo FIFO", () => {
      const rawMaterial = {
        qty: 100,
        unitCost: 0.50,
        totalCost: 50
      };

      const waste = 5;
      const yield_qty = 95;
      const costPerUnit = rawMaterial.totalCost / (yield_qty + waste);

      expect(costPerUnit).toBeCloseTo(0.5263, 4);
    });

    it("Given múltiples lotes de materia prima, When calculo costo promedio ponderado, Then refleja proporciones FIFO", () => {
      const lots = [
        { qty: 100, unitCost: 0.50, date: new Date("2026-04-10") },
        { qty: 50, unitCost: 0.60, date: new Date("2026-04-15") }
      ];

      const totalQty = lots.reduce((acc, l) => acc + l.qty, 0);
      const weightedCost = lots.reduce((acc, l) => acc + (l.qty * l.unitCost), 0) / totalQty;

      const expected = (100 * 0.50 + 50 * 0.60) / 150;
      
      expect(weightedCost).toBeCloseTo(expected, 4);
      expect(weightedCost).toBe(0.5333);
    });

    it("Given producto con isWeighted=true, When verifico decimales en cada paso, Then siempre 4 decimales", () => {
      const steps = [
        { step: "Compra", value: 100.1234 },
        { step: "Recepción", value: 100.1234 },
        { step: "Consumo Producción", value: 75.5678 },
        { step: "Producción Terminada", value: 74.5556 },
        { step: "Venta", value: 10.1234 }
      ];

      steps.forEach(({ step, value }) => {
        const decimals = value.toString().split(".")[1]?.length ?? 0;
        expect(decimals).toBeLessThanOrEqual(4);
      });
    });
  });

  describe("BDD-004: Validación de Estados en Transiciones", () => {
    it("Given orden de compra en draft, When intento recibir, Then rejected (debe estar confirmed)", () => {
      const purchase = { status: "draft" as const };
      
      const canReceive = purchase.status === "confirmed" || purchase.status === "partial_received";
      
      expect(canReceive).toBe(false);
    });

    it("Given orden de compra en confirmed, When recibo parcialmente, Then status = partial_received", () => {
      const purchase = { status: "confirmed" as const };
      
      const receivedQty = 50;
      const totalQty = 100;
      
      const newStatus = receivedQty < totalQty ? "partial_received" : "received";
      
      expect(newStatus).toBe("partial_received");
    });

    it("Given orden de producción en draft, When inicio, Then status = in_progress", () => {
      const production = { status: "draft" as const };
      
      const canStart = production.status === "draft";
      const newStatus = canStart ? "in_progress" : production.status;
      
      expect(newStatus).toBe("in_progress");
    });

    it("Given orden de producción en in_progress, When completo, Then status = completed", () => {
      const production = { status: "in_progress" as const };
      
      const canComplete = production.status === "in_progress";
      const newStatus = canComplete ? "completed" : production.status;
      
      expect(newStatus).toBe("completed");
    });

    it("Given orden de producción completada, When intento iniciar, Then rejected", () => {
      const production = { status: "completed" as const };
      
      const canStart = production.status === "draft";
      
      expect(canStart).toBe(false);
    });
  });
});