import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "@logiscore/core";
import { createPurchasesService } from "../services/purchases.service";

describe("purchases.service", () => {
  it("emite comando para crear categoria desde compras", () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("PURCHASES.CATEGORY_CREATE_REQUESTED", spy);
    const service = createPurchasesService({ eventBus });

    const result = service.requestCreateCategory({ name: "Bebidas" });
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith({ name: "Bebidas" });
  });
});
