/**
 * Componente de formulario para operaciones de inventario.
 * Permite crear almacenes, registrar tallas/colores de productos,
 * registrar movimientos de stock y crear/publicar conteos de inventario.
 */

import { useState } from "react";
import type { Product } from "@/features/products/types/products.types";
import type {
  CreateProductSizeColorInput,
  CreateWarehouseInput,
  InventoryCount,
  StockMovementType,
  Warehouse
} from "../types/inventory.types";
import { Button, Input, Select } from "@/common";

interface InventoryFormProps {
  products: Product[];
  warehouses: Warehouse[];
  counts: InventoryCount[];
  onCreateWarehouse: (input: CreateWarehouseInput) => Promise<void>;
  onCreateSizeColor: (input: CreateProductSizeColorInput) => Promise<void>;
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
    <section style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "8px" }}>
      <h2 style={{ marginTop: 0 }}>Inventario y Bodegas</h2>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <Input
          placeholder="Nombre de bodega"
          value={warehouseName}
          onChange={(event) => setWarehouseName(event.target.value)}
        />
        <Input
          placeholder="Codigo (opcional)"
          value={warehouseCode}
          onChange={(event) => setWarehouseCode(event.target.value)}
        />
        <Button
          onClick={() =>
            onCreateWarehouse({
              name: warehouseName,
              ...(warehouseCode && { code: warehouseCode })
            })
          }
        >
          Crear bodega
        </Button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <Select value={sizeColorProduct} onChange={(value) => setSizeColorProduct(String(value))}>
          <option value="">Producto para talla/color</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </Select>
        <Input placeholder="Talla" value={size} onChange={(e) => setSize(e.target.value)} />
        <Input placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <Button
          onClick={() =>
            onCreateSizeColor({
              productLocalId: sizeColorProduct,
              ...(size && { size }),
              ...(color && { color })
            })
          }
        >
          Agregar talla/color
        </Button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <Select value={movementProduct} onChange={(value) => setMovementProduct(String(value))}>
          <option value="">Producto</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </Select>
        <Select value={movementWarehouse} onChange={(value) => setMovementWarehouse(String(value))}>
          <option value="">Bodega</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.localId} value={warehouse.localId}>
              {warehouse.name}
            </option>
          ))}
        </Select>
        <Select
          value={movementType}
          onChange={(value) => setMovementType(value as StockMovementType)}
        >
          {movementOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min="0.0001"
          step="0.0001"
          value={movementQty}
          onChange={(e) => setMovementQty(e.target.value)}
        />
        <Button
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
        </Button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <Select value={countProduct} onChange={(value) => setCountProduct(String(value))}>
          <option value="">Producto</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </Select>
        <Select value={countWarehouse} onChange={(value) => setCountWarehouse(String(value))}>
          <option value="">Bodega</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.localId} value={warehouse.localId}>
              {warehouse.name}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          step="0.0001"
          min="0"
          value={countQty}
          onChange={(e) => setCountQty(e.target.value)}
        />
        <Button
          onClick={() =>
            onCreateCount({
              productLocalId: countProduct,
              warehouseLocalId: countWarehouse,
              countedQty: Number(countQty)
            })
          }
        >
          Crear conteo
        </Button>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        {counts
          .filter((item) => item.status === "draft")
          .map((count) => (
            <Button
              key={count.localId}
              onClick={() => onPostCount(count.localId)}
            >
              Postear conteo {count.localId.slice(0, 8)}
            </Button>
          ))}
      </div>
    </section>
  );
}

