/**
 * Componente de configuración de tasas de cambio.
 * Permite visualizar y editar manualmente la tasa de cambio USD/VES.
 */

import { useState, useEffect, useCallback } from "react";
import { exchangeRatesService } from "../services/exchange-rates.service.instance";
import { eventBus } from "@/lib/core/runtime";

interface ExchangeRatesConfigProps {
  tenantSlug: string;
}

const DEFAULT_EXCHANGE_RATE = 480;

export function ExchangeRatesConfig({ tenantSlug }: ExchangeRatesConfigProps) {
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadRate = useCallback(async () => {
    setIsLoading(true);
    const result = await exchangeRatesService.getActiveRate(tenantSlug, "USD", "VES");
    if (result.ok && result.data) {
      setExchangeRate(result.data.rate);
      setLastUpdated(result.data.validFrom);
    }
    setIsLoading(false);
  }, [tenantSlug]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    void loadRate();
  }, [loadRate]);

  const handleSave = async () => {
    const newRate = Number(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      return;
    }

    const now = new Date().toISOString();

    await Promise.resolve();
    eventBus.emit("EXCHANGE_RATE.UPDATED", { rate: newRate });

    setExchangeRate(newRate);
    setIsEditing(false);
    setLastUpdated(now);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleRefreshFromApi = async () => {
    setIsLoading(true);
    const result = await exchangeRatesService.fetchAndSaveRates();
    if (result.ok) {
      await loadRate();
      eventBus.emit("EXCHANGE_RATE.REFRESHED", {});
    }
    setIsLoading(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("es-VE", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-surface-300)",
        borderRadius: "8px",
        padding: "16px",
        background: "var(--color-surface-50)"
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "12px" }}>
        Configuración de Moneda
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}>
          Tasa de Cambio USD → Bs
        </label>
        
        {isEditing ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Nueva tasa"
              min="1"
              step="0.01"
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid var(--color-surface-300)",
                width: "120px"
              }}
            />
            <button
              onClick={handleSave}
              style={{
                padding: "8px 16px",
                background: "var(--color-state-success)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Guardar
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 16px",
                background: "var(--color-surface-300)",
                color: "var(--color-content-primary)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "var(--color-brand-600)"
              }}
            >
              {exchangeRate.toFixed(2)} Bs/USD
            </span>
            <button
              onClick={() => {
                setEditValue(exchangeRate.toString());
                setIsEditing(true);
              }}
              style={{
                padding: "6px 12px",
                background: "var(--color-surface-200)",
                border: "1px solid var(--color-surface-300)",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Editar
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "16px", fontSize: "13px", color: "var(--color-content-secondary)" }}>
        <p style={{ margin: "0 0 4px 0" }}>
          Última actualización: {formatDate(lastUpdated)}
        </p>
        <p style={{ margin: 0 }}>
          Fuente: API BCV (automático) o manual
        </p>
      </div>

      <button
        onClick={handleRefreshFromApi}
        disabled={isLoading}
        style={{
          padding: "10px 16px",
          background: "var(--color-brand-500)",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.7 : 1
        }}
      >
        {isLoading ? "Actualizando..." : "Actualizar desde API"}
      </button>

      <div
        style={{
          marginTop: "16px",
          padding: "8px",
          background: "var(--color-state-info)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderRadius: "4px",
          fontSize: "12px"
        }}
      >
        💡 La tasa se actualiza automáticamente a las 7:00 AM. 
        Usa "Editar" para cambiar manualmente si la API falla.
      </div>
    </div>
  );
}
