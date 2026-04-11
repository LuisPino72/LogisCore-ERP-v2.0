import { Search, Edit2, X } from "lucide-react";
import { Badge } from "@/common/components/Badge";
import type { Purchase, Supplier } from "../types/purchases.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";

interface PurchaseOrdersListProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onConfirm: (id: string) => void;
  onEdit: (purchase: { localId: string; items: Purchase["items"] }) => void;
  onCancel: (id: string) => void;
  onStartReceiving: (purchase: { localId: string; status: string; items: Purchase["items"] }) => void;
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  partial_received: "Recepción Parcial",
  received: "Recibida",
  cancelled: "Anulada"
};

const statusVariants: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  draft: "default",
  confirmed: "info",
  partial_received: "warning",
  received: "success",
  cancelled: "error"
};

function canReceive(status: string): boolean {
  return ["draft", "confirmed", "partial_received"].includes(status);
}

export function PurchaseOrdersList({
  purchases,
  suppliers,
  warehouses,
  searchQuery,
  onSearchChange,
  onConfirm,
  onEdit,
  onCancel,
  onStartReceiving
}: PurchaseOrdersListProps) {
  const filteredPurchases = searchQuery
    ? purchases.filter(p => 
        p.localId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.warehouseLocalId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : purchases;

  if (filteredPurchases.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar órdenes..." className="input pl-10" />
          </div>
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <h3 className="text-lg font-semibold text-content-primary mb-1">No hay órdenes de compra</h3>
            <p className="text-sm text-content-secondary mb-4 max-w-sm">Crea tu primera orden de compra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Órdenes de Compra</h3>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Buscar órdenes..." className="input pl-10" />
        </div>

        <div className="space-y-2">
          {filteredPurchases.map((purchase) => {
            const supplier = suppliers.find(s => s.localId === purchase.supplierLocalId);
            const warehouse = warehouses?.find(w => w.localId === purchase.warehouseLocalId);
            
            return (
              <div key={purchase.localId} className="flex items-center justify-between bg-surface-50 rounded-lg border border-surface-200 p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-content-tertiary">{purchase.localId.slice(0, 8)}</span>
                    <Badge variant={statusVariants[purchase.status] ?? "default"}>{statusLabels[purchase.status] ?? purchase.status}</Badge>
                  </div>
                  <div className="text-sm font-medium text-content-primary">
                    {supplier?.name || purchase.supplierName || "Sin proveedor"}
                  </div>
                  <div className="text-xs text-content-secondary">
                    Bodega: {warehouse?.name || purchase.warehouseLocalId} · Items: {purchase.items.length} · Total: ${purchase.total.toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {purchase.status === "draft" && (
                    <>
                      <button onClick={() => onConfirm(purchase.localId)} className="btn btn-sm btn-secondary">Confirmar</button>
                      <button onClick={() => onEdit(purchase)} className="btn btn-sm btn-ghost"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => onCancel(purchase.localId)} className="btn btn-sm btn-ghost text-state-error"><X className="w-3 h-3" /></button>
                    </>
                  )}
                  {canReceive(purchase.status) && (
                    <button onClick={() => onStartReceiving(purchase)} className="btn btn-sm btn-primary">Recepcionar</button>
                  )}
                  {purchase.status === "partial_received" && (
                    <>
                      <button onClick={() => onStartReceiving(purchase)} className="btn btn-sm btn-secondary">Completar</button>
                      <button onClick={() => onCancel(purchase.localId)} className="btn btn-sm btn-ghost text-state-error">Anular</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}