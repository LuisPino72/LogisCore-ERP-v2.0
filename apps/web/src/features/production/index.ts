/**
 * Punto de entrada del módulo de producción.
 * Re-exporta todos los tipos, servicios y componentes públicos del módulo.
 */

export * from "./types/production.types";
export * from "./services/production.service";
export * from "./hooks/useProduction";
export * from "./components/ProductionPanel";
export * from "./components/KpiHeader";
export * from "./components/RecipesTab";
export * from "./components/ProductionOrdersTab";
export * from "./components/ProductionLogsTab";
export * from "./components/NewRecipeModal";
export * from "./components/NewOrderModal";
export * from "./components/CompleteOrderModal";
