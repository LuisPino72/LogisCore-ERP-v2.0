/**
 * Hook personalizado para gestionar el inventario.
 * Provee estado y métodos para interacturar con el servicio de inventario:
 * - Listar almacenes, movimientos, conteos y tallas/colores
 * - Crear almacenes, movimientos de stock, conteos de inventario
 * - Publicar conteos de inventario
 * - Evaluar sugerencias de reorden
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState, useRef, useEffect } from "react";
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
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [warehousesResult, movementsResult, countsResult, sizeColorsResult] =
      await Promise.all([
        serviceRef.current.listWarehouses(tenantRef.current),
        serviceRef.current.listStockMovements(tenantRef.current),
        serviceRef.current.listInventoryCounts(tenantRef.current),
        serviceRef.current.listProductSizeColors(tenantRef.current)
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

    const currentActor = actorRef.current;
    const allowedWarehouses =
      currentActor.role === "employee"
        ? new Set(currentActor.permissions.allowedWarehouseLocalIds ?? [])
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
  }, []);

  const createWarehouse = useCallback(
    async (input: CreateWarehouseInput) => {
      const result = await serviceRef.current.createWarehouse(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  const createProductSizeColor = useCallback(
    async (input: CreateProductSizeColorInput) => {
      const result = await serviceRef.current.createProductSizeColor(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  const recordStockMovement = useCallback(
    async (input: RecordStockMovementInput) => {
      const result = await serviceRef.current.recordStockMovement(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  const createInventoryCount = useCallback(
    async (input: CreateInventoryCountInput) => {
      const result = await serviceRef.current.createInventoryCount(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  const postInventoryCount = useCallback(
    async (inventoryCountLocalId: string) => {
      const result = await serviceRef.current.postInventoryCount(
        tenantRef.current,
        actorRef.current,
        inventoryCountLocalId
      );
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  const evaluateReorder = useCallback(
    async (options?: { minStock?: number; targetStock?: number }) => {
      const result = await serviceRef.current.getReorderSuggestions(tenantRef.current, actorRef.current, options);
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
    []
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