import { useState } from "react";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import type { Product, ProductPresentation } from "../types/products.types";
import { formatPrice } from "../utils/products.utils";

interface PriceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  presentations: ProductPresentation[];
  exchangeRate: number;
  onSave: (presentations: ProductPresentation[]) => void;
}

export function PriceManagementModal({
  isOpen,
  onClose,
  product,
  presentations,
  exchangeRate,
  onSave
}: PriceManagementModalProps) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  const [prevProduct, setPrevProduct] = useState(product);
  const [prevPresentations, setPrevPresentations] = useState(presentations);

  if (product !== prevProduct || presentations !== prevPresentations) {
    if (product && presentations) {
      const productPres = presentations.filter(p => p.productLocalId === product.localId);
      const initialPrices: Record<string, number> = {};
      productPres.forEach(p => {
        initialPrices[p.id] = p.price ?? 0;
      });
      setPrices(initialPrices);
    }
    setPrevProduct(product);
    setPrevPresentations(presentations);
  }

  const handlePriceChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrices(prev => ({ ...prev, [id]: numValue }));
  };

  const handleSave = () => {
    if (!product) return;
    
    const productPres = presentations.filter(p => p.productLocalId === product.localId);
    const updated = productPres.map(p => ({
      ...p,
      price: prices[p.id] ?? 0
    }));
    
    onSave(updated);
    onClose();
  };

  if (!product) return null;

  const productPres = presentations.filter(p => p.productLocalId === product.localId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Precios"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-surface-50 rounded-lg">
          <h3 className="font-medium text-content-primary">{product.name}</h3>
          <p className="text-sm text-content-secondary">SKU: {product.sku}</p>
        </div>

        <div className="overflow-x-auto border border-surface-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-content-primary text-left">Presentación</th>
                <th className="px-4 py-3 text-sm font-medium text-content-primary text-center">Factor</th>
                <th className="px-4 py-3 text-sm font-medium text-content-primary text-right">Precio USD</th>
                <th className="px-4 py-3 text-sm font-medium text-content-primary text-right">Precio Bs (ref.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {productPres.map(pres => {
                const formatted = formatPrice(prices[pres.id], exchangeRate);
                return (
                  <tr key={pres.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 text-sm text-content-primary">
                      {pres.name}
                      {pres.isDefault && (
                        <span className="ml-2 badge badge-brand text-xs">Por defecto</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary text-center">x{pres.factor}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm text-content-secondary">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input w-24 text-right"
                          value={prices[pres.id] ?? 0}
                          onChange={(e) => handlePriceChange(pres.id, e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-content-secondary">
                      {formatted.bs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-surface-50 rounded-lg text-sm text-content-secondary">
          <span className="font-medium">Tasa de cambio activa: </span>
          {exchangeRate.toLocaleString("es-VE")} Bs/USD
        </div>
      </div>
    </Modal>
  );
}
