/**
 * Hook personalizado para gestionar el inventario.
 * Provee estado y métodos para interacturar con el servicio de inventario:
 * - Listar almacenes, movimientos, conteos y tallas/colores
 * - Crear almacenes, movimientos de stock, conteos de inventario
 * - Publicar conteos de inventario
 * - Evaluar sugerencias de reorden
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState } from "react";
import { inventoryService } from "../services/inventory.service.instance";
import type { InventoryService } from "../services/inventory.service";
import type {
  CreateInventoryCountInput,
  CreateProductSizeColorInput,
  CreateWarehouseInput,
  InventoryActorContext,
  InventoryTenantContext,
  InventoryUiState,
  ReorderSuggestion,
  RecordStockMovementInput,
  StockMovement
} from "../types/inventory.types";

const initialState: InventoryUiState = {
  isLoading: false,
  warehouses: [],
  movements: [],
  counts: [],
  sizeColors: [],
  balances: {},
  reorderSuggestions: [],
  lastError: null
};

interface UseInventoryOptions {
  service?: InventoryService;
  tenant: InventoryTenantContext;
  actor: InventoryActorContext;
}

const incomingMovementTypes = new Set<StockMovement["movementType"]>([
  "purchase_in",
  "adjustment_in",
  "production_in",
  "transfer_in",
  "count_adjustment"
]);

export const useInventory = ({
  service = inventoryService,
  tenant,
  actor
}: UseInventoryOptions) => {
  const [state, setState] = useState<InventoryUiState>(initialState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [warehousesResult, movementsResult, countsResult, sizeColorsResult] =
      await Promise.all([
        service.listWarehouses(tenant),
        service.listStockMovements(tenant),
        service.listInventoryCounts(tenant),
        service.listProductSizeColors(tenant)
      ]);

    if (!warehousesResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: warehousesResult.error
      }));
      return;
    }
    if (!movementsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: movementsResult.error
      }));
      return;
    }
    if (!countsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: countsResult.error
      }));
      return;
    }
    if (!sizeColorsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: sizeColorsResult.error
      }));
      return;
    }

    const balances = movementsResult.data.reduce<Record<string, number>>(
      (acc, item) => {
        const key = `${item.productLocalId}:${item.warehouseLocalId}`;
        const signed = incomingMovementTypes.has(item.movementType)
          ? item.quantity
          : -item.quantity;
        acc[key] = (acc[key] ?? 0) + signed;
        return acc;
      },
      {}
    );

    const allowedWarehouses =
      actor.role === "employee"
        ? new Set(actor.permissions.allowedWarehouseLocalIds ?? [])
        : null;
    const filterByWarehouse = <T extends { warehouseLocalId: string }>(items: T[]) =>
      allowedWarehouses
        ? items.filter((item) => allowedWarehouses.has(item.warehouseLocalId))
        : items;

    setState({
      isLoading: false,
      warehouses: allowedWarehouses
        ? warehousesResult.data.filter((w) => allowedWarehouses.has(w.localId))
        : warehousesResult.data,
      movements: filterByWarehouse(movementsResult.data),
      counts: filterByWarehouse(countsResult.data),
      sizeColors: sizeColorsResult.data,
      balances,
      reorderSuggestions: [],
      lastError: null
    });
  }, [actor.permissions.allowedWarehouseLocalIds, actor.role, service, tenant]);

  const createWarehouse = useCallback(
    async (input: CreateWarehouseInput) => {
      const result = await service.createWarehouse(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const createProductSizeColor = useCallback(
    async (input: CreateProductSizeColorInput) => {
      const result = await service.createProductSizeColor(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const recordStockMovement = useCallback(
    async (input: RecordStockMovementInput) => {
      const result = await service.recordStockMovement(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const createInventoryCount = useCallback(
    async (input: CreateInventoryCountInput) => {
      const result = await service.createInventoryCount(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const postInventoryCount = useCallback(
    async (inventoryCountLocalId: string) => {
      const result = await service.postInventoryCount(
        tenant,
        actor,
        inventoryCountLocalId
      );
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  const evaluateReorder = useCallback(
    async (options?: { minStock?: number; targetStock?: number }) => {
      const result = await service.getReorderSuggestions(tenant, actor, options);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      setState((previous) => ({
        ...previous,
        reorderSuggestions: result.data as ReorderSuggestion[],
        lastError: null
      }));
    },
    [actor, service, tenant]
  );

  return {
    state,
    refresh,
    createWarehouse,
    createProductSizeColor,
    recordStockMovement,
    createInventoryCount,
    postInventoryCount,
    evaluateReorder
  };
};
