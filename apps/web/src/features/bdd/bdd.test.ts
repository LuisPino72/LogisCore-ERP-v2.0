/**
 * BDD Test Runner - Recepción → FIFO
 * 
 * Este archivo implementa tests de comportamiento para el flujo crítico de:
 * Recepción de Mercancía → Generación de Lotes FIFO
 * 
 * Sigue el padrão Given-When-Then (Gherkin) sobre Vitest.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { AppError } from "@logiscore/core";

interface PurchaseOrder {
  id: string;
  status: "draft" | "confirmed" | "partial_received" | "received" | "cancelled";
  items: Array<{
    productId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
  }>;
  supplierId: string;
  warehouseId: string;
  currency: "VES" | "USD";
}

interface InventoryLot {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  sourceType: string;
  sourceId: string;
  createdAt: Date;
  status: "active" | "consumed";
}

type ReceiveResult = { ok: true; lots: InventoryLot[] } | { ok: false; error: AppError };

function createPurchaseOrder(status: PurchaseOrder["status"], qtyOrdered: number, qtyReceived: number): PurchaseOrder {
  return {
    id: "po-001",
    status,
    items: [
      {
        productId: "prod-a",
        quantityOrdered: qtyOrdered,
        quantityReceived: qtyReceived,
        unitCost: 5.00,
      },
    ],
    supplierId: "sup-001",
    warehouseId: "wh-001",
    currency: "USD",
  };
}

function receiveItems(
  order: PurchaseOrder,
  quantityToReceive: number,
  warehouseId: string
): ReceiveResult {
  const item = order.items[0];
  if (!item) {
    return { ok: false, error: { code: "INVALID_ITEM", message: "Item no encontrado", retryable: false } };
  }
  
  if (order.status === "cancelled") {
    return { 
      ok: false, 
      error: {
        code: "PURCHASE_CANCELLED_NOT_RECEIVABLE",
        message: "No se puede recibir una orden cancelada",
        retryable: false,
      }
    };
  }
  
  const remaining = item.quantityOrdered - item.quantityReceived;
  
  if (quantityToReceive > remaining) {
    return { 
      ok: false, 
      error: {
        code: "PURCHASE_OVERRECEIVE",
        message: "No se pueden recibir más unidades de las ordenadas",
        retryable: false,
      }
    };
  }

  const newQuantity = item.quantityReceived + quantityToReceive;
  item.quantityReceived = newQuantity;

  if (newQuantity === item.quantityOrdered) {
    order.status = "received";
  } else {
    order.status = "partial_received";
  }

  const newLot: InventoryLot = {
    id: `lot-${Date.now()}-${Math.random()}`,
    productId: item.productId,
    warehouseId,
    quantity: quantityToReceive,
    unitCost: item.unitCost,
    sourceType: "purchase_receiving",
    sourceId: order.id,
    createdAt: new Date(),
    status: "active",
  };

  return { ok: true, lots: [newLot] };
}

describe("BDD: Recepción → FIFO", () => {
  describe("Escenario: Recepción parcial genera capa de costo FIFO", () => {
    it("Given: Una orden de compra 'confirmed' con 10 unidades a $5.00", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      
      expect(order.status).toBe("confirmed");
      expect(order.items[0]?.quantityOrdered).toBe(10);
      expect(order.items[0]?.unitCost).toBe(5.00);
    });

    it("When: El usuario recibe 5 unidades en el almacén Principal", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      const result = receiveItems(order, 5, "wh-001");
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.lots).toHaveLength(1);
      }
    });

    it("Then: El sistema debe crear un registro en inventory_lots con quantity: 5 y unit_cost: 5.0000", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      const result = receiveItems(order, 5, "wh-001");
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.lots[0]?.quantity).toBe(5);
        expect(result.lots[0]?.unitCost).toBe(5.0000);
      }
    });

    it("And: El estado de la compra debe cambiar a partial_received", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      receiveItems(order, 5, "wh-001");
      
      expect(order.status).toBe("partial_received");
    });
  });

  describe("Escenario: Recepción completa cambia estado a received", () => {
    it("Given: Una orden de compra 'partial_received' con 5 unidades recibidas", () => {
      const order = createPurchaseOrder("partial_received", 10, 5);
      
      expect(order.status).toBe("partial_received");
    });

    it("When: El usuario recibe las 5 unidades restantes", () => {
      const order = createPurchaseOrder("partial_received", 10, 5);
      const result = receiveItems(order, 5, "wh-001");
      
      expect(result.ok).toBe(true);
    });

    it("Then: El estado de la compra debe cambiar a received", () => {
      const order = createPurchaseOrder("partial_received", 10, 5);
      receiveItems(order, 5, "wh-001");
      
      expect(order.status).toBe("received");
    });
  });

  describe("Escenario: Recepción con sobre-cantidad genera advertencia", () => {
    it("Given: Una orden de compra 'confirmed' con 10 unidades", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      
      expect(order.items[0]?.quantityOrdered).toBe(10);
    });

    it("When: El usuario intenta recibir 12 unidades", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      const result = receiveItems(order, 12, "wh-001");
      
      expect(result.ok).toBe(false);
    });

    it("Then: El sistema debe rechazar la recepción", () => {
      const order = createPurchaseOrder("confirmed", 10, 0);
      receiveItems(order, 12, "wh-001");
      
      expect(order.items[0]?.quantityReceived).toBe(0);
    });
  });

  describe("Escenario: Cancelación de orden impide recepción", () => {
    it("Given: Una orden de compra 'cancelled'", () => {
      const order = createPurchaseOrder("cancelled", 10, 0);
      
      expect(order.status).toBe("cancelled");
    });

    it("When: El usuario intenta recibir mercancía", () => {
      const order = createPurchaseOrder("cancelled", 10, 0);
      const result = receiveItems(order, 5, "wh-001");
      
      expect(result.ok).toBe(false);
    });

    it("Then: El sistema debe rechazar la recepción", () => {
      const order = createPurchaseOrder("cancelled", 10, 0);
      const result = receiveItems(order, 5, "wh-001");
      
      expect(result.error?.code).toBe("PURCHASE_CANCELLED_NOT_RECEIVABLE");
    });
  });
});