import { useState } from "react";
import type { Product } from "@/features/products/types/products.types";
import type {
  InventoryCount,
  StockMovementType,
  Warehouse
} from "../types/inventory.types";

interface InventoryFormProps {
  products: Product[];
  warehouses: Warehouse[];
  counts: InventoryCount[];
  onCreateWarehouse: (input: { name: string; code?: string }) => Promise<void>;
  onCreateSizeColor: (input: {
    productLocalId: string;
    size?: string;
    color?: string;
    skuSuffix?: string;
  }) => Promise<void>;
  onRecordMovement: (input: {
    productLocalId: string;
    warehouseLocalId: string;
    movementType: StockMovementType;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  onCreateCount: (input: {
    productLocalId: string;
    warehouseLocalId: string;
    countedQty: number;
    reason?: string;
  }) => Promise<void>;
  onPostCount: (localId: string) => Promise<void>;
}

const movementOptions: StockMovementType[] = [
  "purchase_in",
  "sale_out",
  "adjustment_in",
  "adjustment_out",
  "production_in",
  "production_out",
  "transfer_in",
  "transfer_out"
];

export function InventoryForm({
  products,
  warehouses,
  counts,
  onCreateWarehouse,
  onCreateSizeColor,
  onRecordMovement,
  onCreateCount,
  onPostCount
}: InventoryFormProps) {
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [sizeColorProduct, setSizeColorProduct] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [movementProduct, setMovementProduct] = useState("");
  const [movementWarehouse, setMovementWarehouse] = useState("");
  const [movementType, setMovementType] =
    useState<StockMovementType>("purchase_in");
  const [movementQty, setMovementQty] = useState("1");
  const [countProduct, setCountProduct] = useState("");
  const [countWarehouse, setCountWarehouse] = useState("");
  const [countQty, setCountQty] = useState("0");

  return (
    <section style={{ border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Inventario y Bodegas</h2>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <input
          placeholder="Nombre de bodega"
          value={warehouseName}
          onChange={(event) => setWarehouseName(event.target.value)}
        />
        <input
          placeholder="Codigo (opcional)"
          value={warehouseCode}
          onChange={(event) => setWarehouseCode(event.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            onCreateWarehouse({
              name: warehouseName,
              code: warehouseCode || undefined
            })
          }
        >
          Crear bodega
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <select value={sizeColorProduct} onChange={(e) => setSizeColorProduct(e.target.value)}>
          <option value="">Producto para talla/color</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <input placeholder="Talla" value={size} onChange={(e) => setSize(e.target.value)} />
        <input placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <button
          type="button"
          onClick={() =>
            onCreateSizeColor({
              productLocalId: sizeColorProduct,
              size: size || undefined,
              color: color || undefined
            })
          }
        >
          Agregar talla/color
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <select value={movementProduct} onChange={(e) => setMovementProduct(e.target.value)}>
          <option value="">Producto</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <select value={movementWarehouse} onChange={(e) => setMovementWarehouse(e.target.value)}>
          <option value="">Bodega</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.localId} value={warehouse.localId}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value as StockMovementType)}
        >
          {movementOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0.0001"
          step="0.0001"
          value={movementQty}
          onChange={(e) => setMovementQty(e.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            onRecordMovement({
              productLocalId: movementProduct,
              warehouseLocalId: movementWarehouse,
              movementType,
              quantity: Number(movementQty)
            })
          }
        >
          Registrar movimiento
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <select value={countProduct} onChange={(e) => setCountProduct(e.target.value)}>
          <option value="">Producto</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <select value={countWarehouse} onChange={(e) => setCountWarehouse(e.target.value)}>
          <option value="">Bodega</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.localId} value={warehouse.localId}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={countQty}
          onChange={(e) => setCountQty(e.target.value)}
        />
        <button
          type="button"
          onClick={() =>
            onCreateCount({
              productLocalId: countProduct,
              warehouseLocalId: countWarehouse,
              countedQty: Number(countQty)
            })
          }
        >
          Crear conteo
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {counts
          .filter((item) => item.status === "draft")
          .map((count) => (
            <button
              key={count.localId}
              type="button"
              onClick={() => onPostCount(count.localId)}
            >
              Postear conteo {count.localId.slice(0, 8)}
            </button>
          ))}
      </div>
    </section>
  );
}

