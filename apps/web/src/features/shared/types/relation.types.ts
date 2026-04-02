// Shared - Tipos para relaciones entre módulos: comisiones, proveedores y créditos

// Trazabilidad de lotes en logs de producción
export interface ProductionLogLotTraceability {
  id: string;
  tenantId: string;
  productionLogLocalId: string;
  inventoryLotId: string;
  quantityUsed: number;
  createdAt: string;
}

export interface SalesCommission {
  id: string;
  tenantId: string;
  saleLocalId: string;
  salesPersonId: string;
  commissionRate: number;
  commissionAmount: number;
  paid: boolean;
  paidAt?: string | null;
  createdAt: string;
}

export interface ProductPreferredSupplier {
  id: string;
  tenantId: string;
  productId: string;
  supplierName: string;
  priority: number;
  createdAt: string;
}

export interface CustomerCreditLimit {
  id: string;
  tenantId: string;
  customerId: string;
  limitAmount: number;
  currentBalance: number;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesCommissionInput {
  saleLocalId: string;
  salesPersonId: string;
  commissionRate: number;
  commissionAmount: number;
}

export interface ProductPreferredSupplierInput {
  productId: string;
  supplierName: string;
  priority: number;
}

export interface CustomerCreditLimitInput {
  customerId: string;
  limitAmount: number;
  currency?: string;
}