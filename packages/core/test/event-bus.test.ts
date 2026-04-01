import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "../src/event-bus";

describe("InMemoryEventBus", () => {
  it("emite eventos a suscriptores", () => {
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    eventBus.on("CORE.BOOTSTRAP_COMPLETED", handler);

    eventBus.emit("CORE.BOOTSTRAP_COMPLETED", { ok: true });
    expect(handler).toHaveBeenCalledWith({ ok: true });
  });

  it("permite desuscribir handlers", () => {
    const eventBus = new InMemoryEventBus();
    const handler = vi.fn();
    const unsubscribe = eventBus.on("SYNC.STATUS_CHANGED", handler);

    unsubscribe();
    eventBus.emit("SYNC.STATUS_CHANGED", { status: "idle" });
    expect(handler).not.toHaveBeenCalled();
  });
});
