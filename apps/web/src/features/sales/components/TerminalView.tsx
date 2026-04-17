import { useCallback, useMemo, useState } from "react";
import { Search, Scale, Plus, Minus, X, ShoppingCart, Package, Box } from "lucide-react";
import type { Product } from "@/features/products/types/products.types";
import type { SaleItem, SalePayment, SalesCurrency } from "../types/sales.types";
import {
  roundMoney,
  formatQty,
  formatCurrency,
  formatCurrencyDual,
  calculateSubtotal,
  calculateIVA,
  calculateIGTF,
  calculateTotalPaid,
  calculateChange,
  validateCentsRule
} from "../utils/sales.utils";

interface TerminalViewProps {
  products: Product[];
  cart: SaleItem[];
  exchangeRate: number;
  saleCurrency: SalesCurrency;
  ivaRate: number;
  onAddToCart: (product: Product, qty: number) => void;
  onUpdateCartItem: (index: number, qty: number) => void;
  onRemoveCartItem: (index: number) => void;
  onClearCart: () => void;
  onOpenBox: () => void;
  onSuspendSale: (notes: string) => void;
  onFinalizeSale: () => void;
  onSelectWarehouse: (localId: string) => void;
  warehouses: { localId: string; name: string }[];
  selectedWarehouse: string;
  isBoxOpen: boolean;
  pendingPayments: SalePayment[];
  onAddPayment: (payment: SalePayment) => void;
  onRemovePayment: (index: number) => void;
}

export function TerminalView({
  products,
  cart,
  exchangeRate,
  saleCurrency,
  ivaRate,
  onAddToCart,
  onUpdateCartItem,
  onRemoveCartItem,
  onClearCart,
  onOpenBox,
  onSuspendSale,
  onFinalizeSale,
  onSelectWarehouse,
  warehouses,
  selectedWarehouse,
  isBoxOpen,
  pendingPayments,
  onAddPayment,
  onRemovePayment
}: TerminalViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendNotes, setSuspendNotes] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentCurrency, setNewPaymentCurrency] = useState<SalesCurrency>("VES");
  const [newPaymentMethod, setNewPaymentMethod] = useState<SalePayment["method"]>("cash");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const iva = useMemo(() => calculateIVA(subtotal, ivaRate), [subtotal, ivaRate]);
  const igtf = useMemo(() => calculateIGTF(pendingPayments, exchangeRate), [pendingPayments, exchangeRate]);
  const total = useMemo(() => roundMoney(subtotal + iva + igtf), [subtotal, iva, igtf]);
  const totalPaid = useMemo(() => calculateTotalPaid(pendingPayments, saleCurrency, exchangeRate), [pendingPayments, saleCurrency, exchangeRate]);
  const change = useMemo(() => calculateChange(totalPaid, total), [totalPaid, total]);

  const centsRuleValid = useMemo(() => {
    if (saleCurrency === "VES" && totalPaid > 0) {
      return validateCentsRule(totalPaid, total);
    }
    return true;
  }, [totalPaid, total, saleCurrency]);

  const handleAddProduct = useCallback((product: Product) => {
    onAddToCart(product, 1);
  }, [onAddToCart]);

  const handleAddPayment = useCallback(() => {
    const amount = Number(newPaymentAmount);
    if (amount <= 0) return;
    onAddPayment({
      method: newPaymentMethod,
      currency: newPaymentCurrency,
      amount
    });
    setNewPaymentAmount("");
  }, [newPaymentAmount, newPaymentMethod, newPaymentCurrency, onAddPayment]);

  const handleSuspend = useCallback(() => {
    onSuspendSale(suspendNotes);
    setShowSuspendModal(false);
    setSuspendNotes("");
  }, [suspendNotes, onSuspendSale]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto por nombre o SKU..."
            className="input pl-10"
          />
        </div>
        <select
          value={selectedWarehouse}
          onChange={(e) => onSelectWarehouse(e.target.value)}
          className="input w-48"
        >
          {warehouses.map(w => (
            <option key={w.localId} value={w.localId}>{w.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-content-primary mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Catálogo de Productos
            </h3>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-content-secondary">
                No hay productos disponibles
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <ProductButton 
                    key={product.localId} 
                    product={product} 
                    exchangeRate={exchangeRate} 
                    onAdd={handleAddProduct} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-content-primary mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrito de Compras
              {cart.length > 0 && (
                <span className="badge badge-brand ml-auto">{cart.length}</span>
              )}
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-content-secondary">
                Agregue productos del catálogo
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const product = products.find(p => p.localId === item.productLocalId);
                  const isWeighted = product?.isWeighted ?? false;
                  const step = isWeighted ? 0.0001 : 1;

                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {product?.name ?? item.productLocalId}
                        </div>
                        <div className="text-xs text-content-secondary">
                          ${item.unitPrice.toFixed(2)} x {formatQty(item.qty, isWeighted)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateCartItem(index, Math.max(step, item.qty - step))}
                          className="p-1 rounded hover:bg-surface-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          step={step}
                          min={step}
                          value={item.qty}
                          onChange={(e) => onUpdateCartItem(index, Number(e.target.value))}
                          className="w-16 text-center text-sm border rounded px-1 py-0.5"
                        />
                        <button
                          onClick={() => onUpdateCartItem(index, item.qty + step)}
                          className="p-1 rounded hover:bg-surface-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-medium w-20 text-right">
                        ${(item.qty * item.unitPrice).toFixed(2)}
                      </div>
                      <button
                        onClick={() => onRemoveCartItem(index)}
                        className="p-1 rounded text-state-error hover:bg-state-error/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">IVA ({ivaRate * 100}%)</span>
                  <span className="font-medium">${iva.toFixed(2)}</span>
                </div>
                {igtf > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">IGTF (3%)</span>
                    <span className="font-medium">${igtf.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-surface-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="card p-4">
            <h4 className="font-medium text-sm text-content-primary mb-3">Pagos</h4>
            <div className="space-y-2">
              {pendingPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-surface-50 rounded">
                  <div className="text-sm">
                    <span className="font-medium capitalize">{payment.method}</span>
                    <span className="text-content-secondary mx-1">|</span>
                    <span>{payment.currency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <button
                      onClick={() => onRemovePayment(index)}
                      className="p-1 text-state-error"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-surface-200 space-y-2">
              <div className="flex gap-2">
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value as SalePayment["method"])}
                  className="input w-24"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="mobile">Pago Móvil</option>
                </select>
                <select
                  value={newPaymentCurrency}
                  onChange={(e) => setNewPaymentCurrency(e.target.value as SalesCurrency)}
                  className="input w-20"
                >
                  <option value="VES">VES</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  placeholder="Monto"
                  className="input flex-1"
                />
              </div>
              <button
                onClick={handleAddPayment}
                disabled={!newPaymentAmount || Number(newPaymentAmount) <= 0}
                className="btn btn-secondary w-full"
              >
                <Plus className="w-4 h-4" />
                Agregar Pago
              </button>
            </div>

            {pendingPayments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-200">
                <div className="flex justify-between text-sm">
                  <span className="text-content-secondary">Total Pagado</span>
                  <span className="font-medium">{formatCurrency(totalPaid, saleCurrency)}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-content-secondary">Cambio</span>
                    <span className="font-medium text-state-success">{formatCurrency(change, saleCurrency)}</span>
                  </div>
                )}
                {!centsRuleValid && (
                  <div className="mt-2 p-2 bg-state-error/5 border border-state-error/10 rounded text-xs text-state-error">
                    ⚠️ Diferencia excede 0.01 Bs (Regla de los Céntimos)
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {!isBoxOpen && (
              <button onClick={onOpenBox} className="btn btn-secondary flex-1">
                <Box className="w-4 h-4" />
                Abrir Caja
              </button>
            )}
            <button
              onClick={() => setShowSuspendModal(true)}
              disabled={cart.length === 0}
              className="btn btn-secondary flex-1"
            >
              <Package className="w-4 h-4" />
              Suspender
            </button>
            <button
              onClick={onFinalizeSale}
              disabled={cart.length === 0 || !isBoxOpen || totalPaid < total}
              className="btn btn-primary flex-1"
            >
              <ShoppingCart className="w-4 h-4" />
              Finalizar
            </button>
            {cart.length > 0 && (
              <button onClick={onClearCart} className="btn btn-ghost">
                <X className="w-4 h-4" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuspendModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Suspender Venta</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Notas (opcional)</label>
                <textarea
                  value={suspendNotes}
                  onChange={(e) => setSuspendNotes(e.target.value)}
                  placeholder="Agregue una nota para esta venta..."
                  className="input min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowSuspendModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button onClick={handleSuspend} className="btn btn-primary">
                  Suspender
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Extracted Sub-Components for Performance and Vercel Best Practices (rendering-no-inline-components)

function ProductButton({ 
  product, 
  exchangeRate, 
  onAdd 
}: { 
  product: Product; 
  exchangeRate: number; 
  onAdd: (p: Product) => void;
}) {
  const handleClick = useCallback(() => onAdd(product), [onAdd, product]);

  return (
    <button
      onClick={handleClick}
      className="p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all text-left bg-white"
    >
      <div className="flex items-start justify-between">
        <span className="font-medium text-sm text-content-primary truncate flex-1">
          {product.name}
        </span>
        {product.isWeighted && (
          <Scale className="w-3 h-3 text-brand-600 shrink-0 ml-1" />
        )}
      </div>
      <div className="text-xs text-content-secondary mt-1">
        {(product as { price?: number }).price !== undefined ? (
          formatCurrencyDual((product as { price?: number }).price ?? 0, exchangeRate)
        ) : (
          <span className="text-xs text-content-tertiary">Sin precio</span>
        )}
      </div>
      {product.sku && (
        <div className="text-xs text-content-tertiary mt-1">
          SKU: {product.sku}
        </div>
      )}
    </button>
  );
}
