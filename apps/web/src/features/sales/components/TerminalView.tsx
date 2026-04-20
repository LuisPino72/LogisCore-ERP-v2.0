import { useCallback, useMemo, useState } from "react";
import { Scale, Plus, Minus, X, ShoppingCart, Package, Box } from "lucide-react";
import { Button, Card, Badge, Alert, SearchInput, Input, Select, Textarea } from "@/common";
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
         <div className="flex-1">
           <SearchInput 
             value={searchQuery} 
             onChange={setSearchQuery} 
             placeholder="Buscar producto por nombre o SKU..." 
           />
         </div>
         <Select
           value={selectedWarehouse}
           onChange={(val) => onSelectWarehouse(val as string)}
           options={warehouses.map(w => ({ label: w.name, value: w.localId }))}
           className="w-48"
         />
       </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title={<div className="flex items-center gap-2"><Package className="w-4 h-4" /> Catálogo de Productos</div>}>
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
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Carrito de Compras
              {cart.length > 0 && (
                <Badge variant="info" className="ml-auto">{cart.length}</Badge>
              )}
            </div>
          }>
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
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => onUpdateCartItem(index, Math.max(step, item.qty - step))}
                           className="p-1"
                         >
                           <Minus className="w-3 h-3" />
                         </Button>
                         <Input
                           type="number"
                           step={step}
                           min={step}
                           value={item.qty}
                           onChange={(e) => onUpdateCartItem(index, Number(e.target.value))}
                           className="w-16 text-center px-1 py-0.5"
                         />
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => onUpdateCartItem(index, item.qty + step)}
                           className="p-1"
                         >
                           <Plus className="w-3 h-3" />
                         </Button>
                       </div>
                       <div className="text-sm font-medium w-20 text-right">
                         ${(item.qty * item.unitPrice).toFixed(2)}
                       </div>
                       <Button
                         variant="ghost"
                         onClick={() => onRemoveCartItem(index)}
                         className="p-1 text-state-error hover:bg-state-error/10"
                       >
                         <X className="w-4 h-4" />
                       </Button>

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
          </Card>

          <Card title={<div className="font-medium text-sm text-content-primary">Pagos</div>}>
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
                    <Button
                      variant="ghost"
                      onClick={() => onRemovePayment(index)}
                      className="p-1 text-state-error"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-surface-200 space-y-2">
               <div className="flex gap-2">
                 <Select
                   value={newPaymentMethod}
                   onChange={(val) => setNewPaymentMethod(val as SalePayment["method"])}
                   options={[
                     { label: "Efectivo", value: "cash" },
                     { label: "Tarjeta", value: "card" },
                     { label: "Transferencia", value: "transfer" },
                     { label: "Pago Móvil", value: "mobile" },
                   ]}
                   className="w-24"
                 />
                 <Select
                   value={newPaymentCurrency}
                   onChange={(val) => setNewPaymentCurrency(val as SalesCurrency)}
                   options={[
                     { label: "VES", value: "VES" },
                     { label: "USD", value: "USD" },
                   ]}
                   className="w-20"
                 />
                 <Input
                   type="number"
                   step="0.01"
                   min="0"
                   value={newPaymentAmount}
                   onChange={(e) => setNewPaymentAmount(e.target.value)}
                   placeholder="Monto"
                   className="flex-1"
                 />
               </div>

              <Button
                onClick={handleAddPayment}
                disabled={!newPaymentAmount || Number(newPaymentAmount) <= 0}
                variant="secondary"
                className="w-full"
              >
                <Plus className="w-4 h-4" />
                Agregar Pago
              </Button>
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
                  <Alert variant="warning" className="mt-2">
                    Diferencia excede 0.01 Bs (Regla de los Céntimos)
                  </Alert>
                )}
              </div>
            )}
          </Card>

          <div className="flex gap-2 flex-wrap">
            {!isBoxOpen && (
              <Button onClick={onOpenBox} variant="secondary" className="flex-1">
                <Box className="w-4 h-4" />
                Abrir Caja
              </Button>
            )}
            <Button
              onClick={() => setShowSuspendModal(true)}
              disabled={cart.length === 0}
              variant="secondary"
              className="flex-1"
            >
              <Package className="w-4 h-4" />
              Suspender
            </Button>
            <Button
              onClick={onFinalizeSale}
              disabled={cart.length === 0 || !isBoxOpen || totalPaid < total}
              variant="primary"
              className="flex-1"
            >
              <ShoppingCart className="w-4 h-4" />
              Finalizar
            </Button>
            {cart.length > 0 && (
              <Button onClick={onClearCart} variant="ghost">
                <X className="w-4 h-4" />
                Limpiar
              </Button>
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
                 <Textarea
                   value={suspendNotes}
                   onChange={(e) => setSuspendNotes(e.target.value)}
                   placeholder="Agregue una nota para esta venta..."
                   className="min-h-[80px]"
                 />
               </div>

              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowSuspendModal(false)} variant="secondary">
                  Cancelar
                </Button>
                <Button onClick={handleSuspend} variant="primary">
                  Suspender
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
     <Button
       variant="ghost"
       onClick={handleClick}
       className="p-3 rounded-lg border border-surface-200 hover:border-brand-300 hover:shadow-md transition-all text-left bg-white h-auto align-start"
     >
       <div className="flex items-start justify-between w-full">
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
     </Button>
   );
 }
