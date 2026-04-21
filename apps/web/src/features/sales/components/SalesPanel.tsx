/**
 * Panel Maestro de Ventas (Terminal POS).
 * Diseño con pestañas para: Terminal, Ventas Realizadas, Suspendidas, Cierres.
 * 
 * Características:
 * - Navegación por Tabs
 * - KPI Header: Venta del Día, Estado de Caja, Tasa USD/VES, Suspendidas
 * - TerminalView: Buscador + Bento Grid (Catálogo + Carrito)
 * - Badges de estado: completed (verde), voided (rojo), refunded (azul)
 * - Reglas: cajaabierta, stockpositivo, decimales (4 para pesables), IGTF (3%), céntimos
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { Alert } from "@/common/components/Alert";
import type { Product } from "@/features/products/types/products.types";
import { useSales } from "../hooks/useSales";
import { salesService } from "../services/sales.service.instance";
import type {
  SaleItem,
  SalePayment,
  SalesActorContext,
  SalesCurrency
} from "../types/sales.types";
import { SalesKPIs } from "./SalesKPIs";
import { TerminalView } from "./TerminalView";
import { SalesDataTable } from "./SalesDataTable";
import { SuspendedList } from "./SuspendedList";
import { BoxClosingsList } from "./BoxClosingsList";
import { OpenBoxModal } from "./OpenBoxModal";
import {
  roundMoney,
  isBoxOpen,
  calculateSubtotal,
  calculateIVA,
  calculateIGTF,
  calculateTotalPaid,
  canSuspendMore,
  getOpenSuspendedCount
} from "../utils/sales.utils";

interface SalesPanelProps {
  tenantSlug: string;
  actor: SalesActorContext;
  products: Product[];
  exchangeRate?: number;
  onRefreshExchangeRate?: () => Promise<void>;
}

const IVA_RATE = 0.16;
const MAX_SUSPENDED = 10;

export function SalesPanel({
  tenantSlug,
  actor,
  products,
  exchangeRate: exchangeRateFromApp,
  onRefreshExchangeRate
}: SalesPanelProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [saleCurrency] = useState<SalesCurrency>("VES");
  const [exchangeRate, setExchangeRate] = useState(exchangeRateFromApp ?? 1);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [showOpenBoxModal, setShowOpenBoxModal] = useState(false);
  const [activeTab, setActiveTab] = useState("terminal");

  const [prevRate, setPrevRate] = useState(exchangeRateFromApp);
  if (exchangeRateFromApp !== prevRate) {
    setExchangeRate(exchangeRateFromApp ?? 1);
    setPrevRate(exchangeRateFromApp);
  }

  const tenant = useMemo(() => ({ tenantSlug }), [tenantSlug]);

  const {
    state,
    refresh,
    createSuspendedSale,
    createPosSale,
    restoreSuspendedSale,
    openBox,
    closeBox
  } = useSales({
    service: salesService,
    tenant,
    actor
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offSaleCompleted = eventBus.on("SALE.COMPLETED", () => void refresh());
    const offBoxClosed = eventBus.on("POS.BOX_CLOSED", () => void refresh());
    const offBoxOpened = eventBus.on("POS.BOX_OPENED", () => void refresh());
    const offSuspended = eventBus.on("SALE.SUSPENDED", () => void refresh());

    return () => {
      offSaleCompleted();
      offBoxClosed();
      offBoxOpened();
      offSuspended();
    };
  }, [refresh]);

  const handleRefreshRate = useCallback(async () => {
    setIsLoadingRate(true);
    if (onRefreshExchangeRate) {
      await onRefreshExchangeRate();
    }
    setIsLoadingRate(false);
  }, [onRefreshExchangeRate]);

  const boxIsOpen = useMemo(
    () => isBoxOpen(state.boxClosings, selectedWarehouse),
    [state.boxClosings, selectedWarehouse]
  );

  const openSuspendedCount = useMemo(
    () => getOpenSuspendedCount(state.suspendedSales),
    [state.suspendedSales]
  );

  const addToCart = useCallback((product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productLocalId === product.localId);
      if (existing) {
        return prev.map(item =>
          item.productLocalId === product.localId
            ? { ...item, qty: item.qty + qty }
            : item
        );
      }
      return [...prev, {
        productLocalId: product.localId,
        qty,
        unitPrice: (product as { price?: number }).price ?? 0
      }];
    });
  }, []);

  const updateCartItem = useCallback((index: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== index));
    } else {
      setCart(prev => prev.map((item, i) =>
        i === index ? { ...item, qty } : item
      ));
    }
  }, []);

  const removeCartItem = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPayments([]);
  }, []);

  const addPayment = useCallback((payment: SalePayment) => {
    setPayments(prev => [...prev, payment]);
  }, []);

  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleOpenBox = useCallback(async (openingAmount: number) => {
    if (!selectedWarehouse) return;
    await openBox({
      warehouseLocalId: selectedWarehouse,
      openingAmount
    });
    setShowOpenBoxModal(false);
  }, [selectedWarehouse, openBox]);

  const handleSuspendSale = useCallback(async (notes: string) => {
    if (!selectedWarehouse || !canSuspendMore(openSuspendedCount, MAX_SUSPENDED)) return;
    await createSuspendedSale({
      warehouseLocalId: selectedWarehouse,
      cart,
      notes
    });
    setCart([]);
    setPayments([]);
  }, [selectedWarehouse, cart, openSuspendedCount, createSuspendedSale]);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const iva = useMemo(() => calculateIVA(subtotal, IVA_RATE), [subtotal]);
  const igtf = useMemo(() => calculateIGTF(payments, exchangeRate), [payments, exchangeRate]);
  const total = useMemo(() => roundMoney(subtotal + iva + igtf), [subtotal, iva, igtf]);
  const totalPaid = useMemo(() => calculateTotalPaid(payments, saleCurrency, exchangeRate), [payments, saleCurrency, exchangeRate]);

  const handleFinalizeSale = useCallback(async () => {
    if (!selectedWarehouse || !boxIsOpen || cart.length === 0 || totalPaid < total) return;
    
    await createPosSale({
      warehouseLocalId: selectedWarehouse,
      currency: saleCurrency,
      exchangeRate,
      subtotal,
      taxTotal: iva,
      discountTotal: 0,
      igtfAmount: igtf,
      total,
      items: cart,
      payments
    });

    setCart([]);
    setPayments([]);
  }, [selectedWarehouse, boxIsOpen, cart, total, totalPaid, saleCurrency, exchangeRate, subtotal, iva, createPosSale]);

  const handleCloseBox = useCallback(async (warehouseLocalId: string) => {
    await closeBox({
      warehouseLocalId,
      countedAmount: 0
    });
  }, [closeBox]);

  const warehouses = useMemo(() => {
    return state.boxClosings.map(b => ({
      localId: b.warehouseLocalId,
      name: b.warehouseLocalId
    })).filter((v, i, a) => a.findIndex(w => w.localId === v.localId) === i);
  }, [state.boxClosings]);

  const terminalTab = (
    <TerminalView
      products={products}
      cart={cart}
      exchangeRate={exchangeRate}
      saleCurrency={saleCurrency}
      ivaRate={IVA_RATE}
      onAddToCart={addToCart}
      onUpdateCartItem={updateCartItem}
      onRemoveCartItem={removeCartItem}
      onClearCart={clearCart}
      onOpenBox={() => setShowOpenBoxModal(true)}
      onSuspendSale={handleSuspendSale}
      onFinalizeSale={handleFinalizeSale}
      onSelectWarehouse={setSelectedWarehouse}
      warehouses={warehouses}
      selectedWarehouse={selectedWarehouse}
      isBoxOpen={boxIsOpen}
      pendingPayments={payments}
      onAddPayment={addPayment}
      onRemovePayment={removePayment}
    />
  );

  const salesTab = (
    <SalesDataTable
      sales={state.sales}
      onView={() => {}}
      onVoid={() => {}}
      onRefund={() => {}}
      onRestore={() => {}}
    />
  );

  const suspendedTab = (
    <SuspendedList
      suspendedSales={state.suspendedSales}
      maxSuspended={MAX_SUSPENDED}
      onRestore={async (localId) => {
        const result = await restoreSuspendedSale(localId);
        if (result) {
          setSelectedWarehouse(result.warehouseLocalId);
          setCart(result.cart);
          setActiveTab("terminal");
        }
      }}
      onDelete={() => {}}
    />
  );

  const closingsTab = (
    <BoxClosingsList
      boxClosings={state.boxClosings}
      warehouses={warehouses}
      onCloseBox={handleCloseBox}
    />
  );

  const tabs: TabItem[] = [
    { id: "terminal", label: "Terminal", content: terminalTab },
    { id: "sales", label: "Ventas Realizadas", content: salesTab },
    { id: "suspended", label: "Suspendidas", content: suspendedTab },
    { id: "closings", label: "Cierres", content: closingsTab }
  ];

  return (
    <section className="p-4 sm:p-6">
      {state.lastError && (
        <Alert 
          variant="error" 
          className="mb-4"
        >
          {state.lastError.message}
        </Alert>
      )}

      <SalesKPIs
        sales={state.sales}
        boxClosings={state.boxClosings}
        suspendedSales={state.suspendedSales}
        exchangeRate={exchangeRate}
        warehouseLocalId={selectedWarehouse}
        onRefreshRate={handleRefreshRate}
        isLoadingRate={isLoadingRate}
      />

       <Tabs
         items={tabs}
         activeTab={activeTab}
         onChange={setActiveTab}
         variant="underline"
       />


      <OpenBoxModal
        isOpen={showOpenBoxModal}
        onClose={() => setShowOpenBoxModal(false)}
        onConfirm={handleOpenBox}
        warehouses={warehouses}
        selectedWarehouse={selectedWarehouse}
        onSelectWarehouse={setSelectedWarehouse}
      />
    </section>
  );
}
