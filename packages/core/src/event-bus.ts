import type { EventBus, EventName } from "./types";

type EventHandler = (payload: unknown) => void;

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<EventName, Set<EventHandler>>();
  private handlerCount = 0;

  emit<TPayload = unknown>(event: EventName, payload: TPayload): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) {
      return;
    }
    for (const handler of eventHandlers) {
      handler(payload);
    }
  }

  on<TPayload = unknown>(
    event: EventName,
    handler: (payload: TPayload) => void
  ): () => void {
    const eventHandlers = this.handlers.get(event) ?? new Set<EventHandler>();
    eventHandlers.add(handler as EventHandler);
    this.handlers.set(event, eventHandlers);
    this.handlerCount++;

    if (this.handlerCount > 50) {
      console.warn(`[EventBus] High handler count (${this.handlerCount}). Ensure unsubscribe is called.`);
    }

    return () => {
      const currentHandlers = this.handlers.get(event);
      if (!currentHandlers) {
        return;
      }
      currentHandlers.delete(handler as EventHandler);
      if (currentHandlers.size === 0) {
        this.handlers.delete(event);
      }
      this.handlerCount = Math.max(0, this.handlerCount - 1);
    };
  }

  getHandlerCount(): number {
    return this.handlerCount;
  }
}
