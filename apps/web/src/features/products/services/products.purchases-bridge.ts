import type { EventBus } from "@logiscore/core";
import type {
  ProductsActorContext,
  ProductsTenantContext
} from "../types/products.types";
import type { ProductsService } from "./products.service";

interface BridgeContext {
  tenant: ProductsTenantContext | null;
  actor: ProductsActorContext | null;
}

interface BridgeDependencies {
  eventBus: EventBus;
  productsService: ProductsService;
}

export interface ProductsPurchasesBridge {
  setContext(context: BridgeContext): void;
  start(): () => void;
}

export const createProductsPurchasesBridge = ({
  eventBus,
  productsService
}: BridgeDependencies): ProductsPurchasesBridge => {
  let context: BridgeContext = {
    tenant: null,
    actor: null
  };

  const setContext = (nextContext: BridgeContext) => {
    context = nextContext;
  };

  const start = () => {
    const offCategoryCreate = eventBus.on<{ name: string }>(
      "PURCHASES.CATEGORY_CREATE_REQUESTED",
      async (payload) => {
        if (!context.tenant || !context.actor) {
          return;
        }
        await productsService.createCategory(context.tenant, context.actor, {
          name: payload.name,
          sourceModule: "purchases"
        });
      }
    );

    const offProductCreate = eventBus.on<{
      name: string;
      categoryId?: string;
      visible: boolean;
      defaultPresentationId?: string;
    }>("PURCHASES.PRODUCT_CREATE_REQUESTED", async (payload) => {
      if (!context.tenant || !context.actor) {
        return;
      }
      await productsService.createProduct(context.tenant, context.actor, {
        name: payload.name,
        categoryId: payload.categoryId,
        visible: payload.visible,
        defaultPresentationId: payload.defaultPresentationId,
        sourceModule: "purchases"
      });
    });

    const offPresentationCreate = eventBus.on<{
      productLocalId: string;
      name: string;
      factor: number;
      barcode?: string;
    }>("PURCHASES.PRESENTATION_CREATE_REQUESTED", async (payload) => {
      if (!context.tenant || !context.actor) {
        return;
      }
      await productsService.createPresentation(context.tenant, context.actor, payload);
    });

    return () => {
      offCategoryCreate();
      offProductCreate();
      offPresentationCreate();
    };
  };

  return {
    setContext,
    start
  };
};
