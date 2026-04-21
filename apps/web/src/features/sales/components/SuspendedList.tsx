import { useMemo, useState } from "react";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { Badge } from "@/common/components/Badge";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { Alert } from "@/common/components/Alert";
import { SearchInput } from "@/common/components/SearchInput";
import type { SuspendedSale } from "../types/sales.types";
import { getSuspendedStatusLabel, calculateSubtotal } from "../utils/sales.utils";

interface SuspendedListProps {
  suspendedSales: SuspendedSale[];
  maxSuspended: number;
  onRestore: (localId: string) => void;
  onDelete: (localId: string) => void;
}

export function SuspendedList({
  suspendedSales,
  maxSuspended,
  onRestore,
  onDelete
}: SuspendedListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSales = useMemo(() => {
    let result = suspendedSales.filter(s => s.status === "open" || s.status === "resumed");
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.localId.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
      );
    }
    
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [suspendedSales, searchQuery]);

  const currentCount = filteredSales.length;
  const canSuspendMore = currentCount < maxSuspended;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 flex-wrap">
          <SearchInput 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder="Buscar..." 
            className="w-full sm:w-64"
          />
        </div>
        <Badge variant={canSuspendMore ? "success" : "warning"}>
          {currentCount} / {maxSuspended} suspendidas
        </Badge>
      </div>

      {!canSuspendMore && (
        <Alert variant="warning">
          Límite máximo alcanzado. Restaure o elimine ventas suspendidas para continuar.
        </Alert>
      )}

      {filteredSales.length === 0 ? (
        <div className="text-center py-12 text-content-secondary">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay ventas suspendidas</p>
          <p className="text-sm mt-1">Las ventas suspendidas aparecerán aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSales.map((sale) => {
            const itemCount = sale.cart?.length ?? 0;
            const total = calculateSubtotal(sale.cart ?? []);
            
            return (
              <Card key={sale.localId} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-sm text-content-secondary">
                      {sale.localId.slice(0, 8)}
                    </span>
                    <Badge variant="warning" className="ml-2">
                      {getSuspendedStatusLabel(sale.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-content-tertiary">
                    {new Date(sale.createdAt).toLocaleString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
                
                <div className="text-sm mb-2">
                  <span className="text-content-secondary">Items:</span>{" "}
                  <span className="font-medium">{itemCount}</span>
                </div>
                <div className="text-sm mb-3">
                  <span className="text-content-secondary">Total:</span>{" "}
                  <span className="font-medium">${total.toFixed(2)}</span>
                </div>
                
                {sale.notes && (
                  <div className="text-xs text-content-tertiary mb-3 italic">
                    "{sale.notes}"
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => onRestore(sale.localId)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restaurar
                  </Button>
                  <Button
                    onClick={() => onDelete(sale.localId)}
                    variant="ghost"
                    size="sm"
                    className="text-state-error"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
