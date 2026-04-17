import { createAppError } from "@logiscore/core";

export const EventBusErrors = {
  EVENT_NOT_REGISTERED: createAppError({
    code: "EVENTBUS_EVENT_NOT_REGISTERED",
    message: "El evento no está registrado en el EventBus",
    retryable: false
  }),
  PAYLOAD_MISMATCH: createAppError({
    code: "EVENTBUS_PAYLOAD_MISMATCH",
    message: "El payload del evento no coincide con el esquema esperado",
    retryable: false
  }),
  INVALID_EVENT_NAME: createAppError({
    code: "EVENTBUS_INVALID_EVENT_NAME",
    message: "El nombre del evento debe seguir el formato MODULO.ACCION",
    retryable: false
  }),
  HANDLER_COUNT_EXCEEDED: createAppError({
    code: "EVENTBUS_HANDLER_COUNT_EXCEEDED",
    message: "El número de handlers registrados excede el límite de 50",
    retryable: false,
    context: { threshold: 50 }
  }),
  PAYLOAD_VALIDATION_FAILED: createAppError({
    code: "EVENTBUS_PAYLOAD_VALIDATION_FAILED",
    message: "La validación del payload contra el esquema SDD falló",
    retryable: false
  })
} as const;

export type EventBusErrorCode = keyof typeof EventBusErrors;