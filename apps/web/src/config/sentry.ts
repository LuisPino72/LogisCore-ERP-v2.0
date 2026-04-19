import * as Sentry from "@sentry/react";

export const initSentry = () => {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Captura 100% de transacciones por ahora
    // Session Replay
    replaysSessionSampleRate: 0.1, // Muestra 10% de sesiones
    replaysOnErrorSampleRate: 1.0, // Muestra 100% de sesiones con errores,
  });
};
