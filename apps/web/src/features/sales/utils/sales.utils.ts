import type { Sale, SaleItem, SalePayment, SalesCurrency, SuspendedSale, BoxClosing } from "../types/sales.types";

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10000) / 10000;

export const formatQty = (qty: number, isWeighted: boolean | null | undefined): string => {
  return isWeighted ? qty.toFixed(4) : qty.toFixed(2);
};

export const formatCurrency = (amount: number, currency: SalesCurrency): string => {
  return currency === "VES" 
    ? `${amount.toFixed(2)} Bs`
    : `$${amount.toFixed(2)}`;
};

export const formatCurrencyDual = (amountUsd: number, exchangeRate: number): string => {
  const amountBs = roundMoney(amountUsd * exchangeRate);
  return `$${amountUsd.toFixed(2)} / ${amountBs.toFixed(2)} Bs`;
};

export const convertToSaleCurrency = (
  amount: number,
  paymentCurrency: SalesCurrency,
  saleCurrency: SalesCurrency,
  exchangeRate: number
): number => {
  if (saleCurrency === paymentCurrency) {
    return roundMoney(amount);
  }
  if (exchangeRate <= 0) {
    return NaN;
  }
  if (saleCurrency === "VES" && paymentCurrency === "USD") {
    return roundMoney(amount * exchangeRate);
  }
  if (saleCurrency === "USD" && paymentCurrency === "VES") {
    return roundMoney(amount / exchangeRate);
  }
  return NaN;
};

export const calculateSubtotal = (items: SaleItem[]): number => {
  return roundMoney(items.reduce((acc, item) => acc + item.unitPrice * item.qty, 0));
};

export const calculateIVA = (subtotal: number, ivaRate: number = 0.16): number => {
  return roundMoney(subtotal * ivaRate);
};

export const calculateIGTF = (
  payments: SalePayment[],
  exchangeRate: number,
  igtfRate: number = 0.03
): number => {
  const foreignPayments = payments.filter(p => p.currency === "USD");
  const foreignTotal = foreignPayments.reduce((sum, p) => sum + p.amount, 0);
  // Calculate IGTF using 4-decimal precision for fiscal accuracy.
  const rawIgtf = foreignTotal * exchangeRate * igtfRate;
  return Math.round((rawIgtf + Number.EPSILON) * 10000) / 10000;
};

export const calculateTotalPaid = (
  payments: SalePayment[],
  saleCurrency: SalesCurrency,
  exchangeRate: number
): number => {
  return roundMoney(
    payments.reduce((acc, payment) => {
      const converted = convertToSaleCurrency(
        payment.amount,
        payment.currency,
        saleCurrency,
        exchangeRate
      );
      return acc + (Number.isNaN(converted) ? 0 : converted);
    }, 0)
  );
};

export const calculateChange = (
  totalPaid: number,
  total: number
): number => {
  return roundMoney(Math.max(0, totalPaid - total));
};

export const validateCentsRule = (totalPaidVes: number, totalVes: number): boolean => {
  const diff = Math.abs(totalPaidVes - totalVes);
  return diff <= 0.01;
};

export const getPaymentMethodLabel = (method: SalePayment["method"]): string => {
  const labels: Record<SalePayment["method"], string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    mobile: "Pago Móvil",
    mixed: "Mixto"
  };
  return labels[method] ?? method;
};

export const getSaleStatusLabel = (status: Sale["status"]): string => {
  const labels: Record<Sale["status"], string> = {
    draft: "Borrador",
    completed: "Completada",
    voided: "Anulada",
    refunded: "Reembolsada"
  };
  return labels[status] ?? status;
};

export const getSaleStatusVariant = (
  status: Sale["status"]
): "success" | "error" | "info" | "warning" => {
  const variants: Record<Sale["status"], "success" | "error" | "info" | "warning"> = {
    draft: "warning",
    completed: "success",
    voided: "error",
    refunded: "info"
  };
  return variants[status] ?? "default";
};

export const getSuspendedStatusLabel = (status: SuspendedSale["status"]): string => {
  const labels: Record<SuspendedSale["status"], string> = {
    open: "Activa",
    resumed: "Restaurada",
    cancelled: "Cancelada",
    converted: "Convertida"
  };
  return labels[status] ?? status;
};

export const getBoxStatusLabel = (status: BoxClosing["status"]): string => {
  return status === "open" ? "Abierta" : "Cerrada";
};

export const getBoxStatusVariant = (
  status: BoxClosing["status"]
): "success" | "error" => {
  return status === "open" ? "success" : "error";
};

export const isBoxOpen = (boxClosings: BoxClosing[], warehouseLocalId: string): boolean => {
  return boxClosings.some(
    b => b.status === "open" && b.warehouseLocalId === warehouseLocalId && !b.deletedAt
  );
};

export const getTodaySalesTotal = (
  sales: Sale[],
  warehouseLocalId?: string
): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return roundMoney(
    sales
      .filter(s => {
        const saleDate = new Date(s.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        const isToday = saleDate.getTime() === today.getTime();
        const isCompleted = s.status === "completed";
        const matchesWarehouse = !warehouseLocalId || s.warehouseLocalId === warehouseLocalId;
        return isToday && isCompleted && matchesWarehouse;
      })
      .reduce((sum, s) => sum + s.total, 0)
  );
};

export const getOpenSuspendedCount = (suspendedSales: { status: string }[]): number => {
  return suspendedSales.filter(s => s.status === "open" || s.status === "resumed").length;
};

export const canSuspendMore = (currentCount: number, maxSuspended: number = 10): boolean => {
  return currentCount < maxSuspended;
};
