import type {
  InventoryCount,
  ProductSizeColor,
  ReorderSuggestion,
  StockMovement,
  Warehouse
} from "../types/inventory.types";

interface InventoryListProps {
  warehouses: Warehouse[];
  movements: StockMovement[];
  counts: InventoryCount[];
  sizeColors: ProductSizeColor[];
  balances: Record<string, number>;
  reorderSuggestions: ReorderSuggestion[];
}

export function InventoryList({
  warehouses,
  movements,
  counts,
  sizeColors,
  balances,
  reorderSuggestions
}: InventoryListProps) {
  return (
    <section style={{ marginTop: "16px" }}>
      <h3>Bodegas</h3>
      {warehouses.length === 0 ? <p>Sin bodegas registradas.</p> : null}
      <ul>
        {warehouses.map((warehouse) => (
          <li key={warehouse.localId}>
            {warehouse.name}
            {warehouse.code ? ` (${warehouse.code})` : ""}
          </li>
        ))}
      </ul>

      <h3>Saldos (producto:bodega)</h3>
      {Object.keys(balances).length === 0 ? <p>Sin movimientos registrados.</p> : null}
      <ul>
        {Object.entries(balances).map(([key, value]) => (
          <li key={key}>
            {key}
            {": "}
            <strong>{value.toFixed(4)}</strong>
          </li>
        ))}
      </ul>

      <h3>Conteos de Inventario</h3>
      <ul>
        {counts.map((count) => (
          <li key={count.localId}>
            {count.productLocalId}
            {" @ "}
            {count.warehouseLocalId}
            {" -> "}
            {count.countedQty.toFixed(4)}
            {" (estado: "}
            {count.status}
            {")"}
          </li>
        ))}
      </ul>

      <h3>Tallas/Colores</h3>
      <ul>
        {sizeColors.map((item) => (
          <li key={item.localId}>
            {item.productLocalId}
            {" - "}
            {item.size ?? "NA"}
            {" / "}
            {item.color ?? "NA"}
          </li>
        ))}
      </ul>

      <h3>Ultimos Movimientos</h3>
      <ul>
        {movements.slice(-10).map((movement) => (
          <li key={movement.localId}>
            {movement.movementType}
            {" | "}
            {movement.productLocalId}
            {" @ "}
            {movement.warehouseLocalId}
            {" | qty "}
            {movement.quantity.toFixed(4)}
          </li>
        ))}
      </ul>

      <h3>Reorden Automatico (basico)</h3>
      {reorderSuggestions.length === 0 ? (
        <p>Sin sugerencias de reorden con la configuracion actual.</p>
      ) : null}
      <ul>
        {reorderSuggestions.map((item) => (
          <li key={`${item.productLocalId}:${item.warehouseLocalId}`}>
            {item.productLocalId}
            {" @ "}
            {item.warehouseLocalId}
            {" | stock "}
            {item.currentStock.toFixed(4)}
            {" | sugerido "}
            {item.suggestedOrderQty.toFixed(4)}
          </li>
        ))}
      </ul>
    </section>
  );
}
