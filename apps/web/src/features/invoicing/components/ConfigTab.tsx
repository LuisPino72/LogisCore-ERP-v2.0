import { useMemo, useState } from "react";
import type { TaxRule, ExchangeRate } from "../types/invoicing.types";
import { DataTable } from "@/common/components/DataTable";
import { Badge } from "@/common/components/Badge";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Settings } from "lucide-react";

interface ConfigTabProps {
  taxRules: TaxRule[];
  exchangeRates: ExchangeRate[];
  isLoading: boolean;
  onSaveTaxRule?: (rule: Omit<TaxRule, "localId" | "tenantId" | "createdAt" | "updatedAt">) => Promise<void>;
  onSaveExchangeRate?: (rate: Omit<ExchangeRate, "localId" | "tenantId" | "createdAt" | "updatedAt">) => Promise<void>;
}

const taxTypeLabels: Record<string, string> = {
  iva: "IVA (16%)",
  islr: "ISLR",
  igtf: "IGTF (3%)",
};

const taxTypeColors: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  iva: "info",
  islr: "warning",
  igtf: "error",
};

export function ConfigTab({
  taxRules,
  exchangeRates,
  isLoading,
}: ConfigTabProps) {
  const [activeSection, setActiveSection] = useState<"taxes" | "rates">("taxes");

  const ivaRule = useMemo(
    () => taxRules.find((r) => r.type === "iva" && r.isActive),
    [taxRules]
  );
  const igtfRule = useMemo(
    () => taxRules.find((r) => r.type === "igtf" && r.isActive),
    [taxRules]
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const taxColumns = useMemo(() => [
    {
      key: "name",
      header: "Nombre",
      render: (_: unknown, row: TaxRule) => (
        <span className="font-medium">{row.name}</span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      align: "center" as const,
      render: (value: unknown) => (
        <Badge variant={taxTypeColors[String(value)] || "default"}>
          {taxTypeLabels[String(value)] || String(value)}
        </Badge>
      ),
    },
    {
      key: "rate",
      header: "Tasa %",
      align: "right" as const,
      render: (value: unknown) => (
        <span className="font-mono">{Number(value).toFixed(2)}%</span>
      ),
    },
    {
      key: "isActive",
      header: "Estado",
      align: "center" as const,
      render: (value: unknown) =>
        value ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="default">Inactivo</Badge>
        ),
    },
    {
      key: "effectiveFrom",
      header: "Vigencia",
      render: (value: unknown, row: TaxRule) => (
        <span className="text-sm text-content-secondary">
          {value
            ? `Desde: ${formatDate(value as string)}`
            : row.efectivoHasta
            ? `Hasta: ${formatDate(row.efectivoHasta)}`
            : "—"}
        </span>
      ),
    },
  ] as const, []);

  const rateColumns = useMemo(() => [
    {
      key: "fromCurrency",
      header: "De",
      render: (value: unknown) => (
        <span className="font-mono">{value as string}</span>
      ),
    },
    {
      key: "toCurrency",
      header: "A",
      render: (value: unknown) => (
        <span className="font-mono">{value as string}</span>
      ),
    },
    {
      key: "rate",
      header: "Tasa",
      align: "right" as const,
      render: (value: unknown) => (
        <span className="font-mono font-medium">{Number(value).toFixed(4)}</span>
      ),
    },
    {
      key: "source",
      header: "Fuente",
      render: (value: unknown) => (
        <span className="text-content-secondary">{value as string}</span>
      ),
    },
    {
      key: "validFrom",
      header: "Vigencia",
      render: (value: unknown) => (
        <span className="text-sm text-content-secondary">
          {value ? formatDate(value as string) : "—"}
        </span>
      ),
    },
  ] as const, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuración SENIAT
        </h3>
      </div>

      <div className="flex gap-2 border-b border-surface-200 pb-2">
        <button
          onClick={() => setActiveSection("taxes")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === "taxes"
              ? "border-b-2 border-brand-500 text-brand-600"
              : "text-content-secondary hover:text-content-primary"
          }`}
        >
          Impuestos
        </button>
        <button
          onClick={() => setActiveSection("rates")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === "rates"
              ? "border-b-2 border-brand-500 text-brand-600"
              : "text-content-secondary hover:text-content-primary"
          }`}
        >
          Tipos de Cambio
        </button>
      </div>

      {activeSection === "taxes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <div className="card-header">
                <span className="card-title">IVA (Impuesto al Valor Agregado)</span>
              </div>
              <div className="card-body">
                {ivaRule ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-content-secondary">Tasa actual:</span>
                      <span className="font-mono font-medium text-lg">
                        {ivaRule.rate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-secondary">Estado:</span>
                      <Badge variant={ivaRule.isActive ? "success" : "default"}>
                        {ivaRule.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-content-tertiary">No hay regla de IVA configurada</p>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">IGTF (Impuesto Grandes Transacciones)</span>
              </div>
              <div className="card-body">
                {igtfRule ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-content-secondary">Tasa actual:</span>
                      <span className="font-mono font-medium text-lg">
                        {igtfRule.rate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-secondary">Estado:</span>
                      <Badge variant={igtfRule.isActive ? "success" : "default"}>
                        {igtfRule.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-content-tertiary mt-2">
                      Aplica sobre pagos en divisas (USD, etc.)
                    </p>
                  </div>
                ) : (
                  <p className="text-content-tertiary">No hay regla de IGTF configurada</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-content-primary mb-3">
              Todas las reglas de impuestos
            </h4>
            {isLoading ? (
              <LoadingSpinner message="Cargando reglas..." />
            ) : taxRules.length === 0 ? (
              <EmptyState
                icon={<Settings className="w-12 h-12 text-content-tertiary" />}
                title="No hay reglas configuradas"
                description="Agrega reglas fiscales para calcular impuestos correctamente."
              />
            ) : (
              <DataTable
                columns={taxColumns as never}
                data={taxRules}
                emptyMessage="No hay reglas de impuestos"
              />
            )}
          </div>
        </div>
      )}

      {activeSection === "rates" && (
        <div className="space-y-4">
          {isLoading ? (
            <LoadingSpinner message="Cargando tipos de cambio..." />
          ) : exchangeRates.length === 0 ? (
            <EmptyState
              icon={<Settings className="w-12 h-12 text-content-tertiary" />}
              title="No hay tipos de cambio"
              description="Configura los tipos de cambio para multi-moneda."
            />
          ) : (
            <DataTable
              columns={rateColumns as never}
              data={exchangeRates}
              emptyMessage="No hay tipos de cambio"
            />
          )}
        </div>
      )}
    </div>
  );
}
