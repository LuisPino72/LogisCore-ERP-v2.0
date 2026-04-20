import { useMemo, useState } from "react";
import type { Invoice, InvoiceStatusFilter } from "../types/invoicing.types";
import { DataTable } from "@/common/components/DataTable";
import { Badge } from "@/common/components/Badge";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Button, Select } from "@/common";
import { FileText, Eye, XCircle } from "lucide-react";

interface InvoicesTabProps {
  invoices: Invoice[];
  isLoading: boolean;
  onViewInvoice: (invoice: Invoice) => void;
  onVoidInvoice: (invoice: Invoice) => void;
  canVoid: boolean;
}

const statusConfig: Record<string, { variant: "default" | "success" | "error"; label: string }> = {
  draft: { variant: "default", label: "Borrador" },
  issued: { variant: "success", label: "Emitida" },
  voided: { variant: "error", label: "Anulada" },
};

export function InvoicesTab({
  invoices,
  isLoading,
  onViewInvoice,
  onVoidInvoice,
  canVoid,
}: InvoicesTabProps) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>("all");

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((inv) => inv.status === statusFilter);
  }, [invoices, statusFilter]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const columns = useMemo(() => [
    {
      key: "invoiceNumber",
      header: "Número",
      render: (_: unknown, row: Invoice) => (
        <span className="font-mono text-sm">
          {row.invoiceNumber || row.localId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "customerName",
      header: "Cliente",
      render: (_: unknown, row: Invoice) => (
        <span className="font-medium">
          {row.customerName || "Sin cliente"}
        </span>
      ),
    },
    {
      key: "customerRif",
      header: "RIF",
      render: (_: unknown, row: Invoice) => (
        <span className="font-mono text-sm text-content-secondary">
          {row.customerRif || "—"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right" as const,
      render: (value: unknown, row: Invoice) => (
        <span className="font-mono font-medium">
          {formatCurrency(value as number, row.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      align: "center" as const,
      render: (value: unknown) => {
        const config = statusConfig[value as string] || { variant: "default" as const, label: "Desconocido" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "issuedAt",
      header: "Fecha",
      render: (value: unknown, row: Invoice) => (
        <span className="text-sm text-content-secondary">
          {row.issuedAt
            ? formatDate(row.issuedAt)
            : row.status === "voided" && row.voidedAt
            ? formatDate(row.voidedAt)
            : formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      align: "center" as const,
      render: (_: unknown, row: Invoice) => (
        <div className="flex items-center gap-2 justify-center">
          <Button
            onClick={() => onViewInvoice(row)}
            variant="ghost"
            size="sm"
            title="Ver detalles"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.status !== "voided" && canVoid && (
            <Button
              onClick={() => onVoidInvoice(row)}
              variant="ghost"
              size="sm"
              title="Anular factura"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ] as const, [canVoid, onViewInvoice, onVoidInvoice]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary">Facturas</h3>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as InvoiceStatusFilter)}
            className="py-1.5 px-3 text-sm w-auto"
          >
            <option value="all">Todas</option>
            <option value="draft">Borrador</option>
            <option value="issued">Emitidas</option>
            <option value="voided">Anuladas</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Cargando facturas..." />
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-content-tertiary" />}
          title="No hay facturas"
          description={statusFilter === "all" 
            ? "Crea tu primera factura para comenzar."
            : `No hay facturas con estado "${statusFilter}".`}
        />
      ) : (
        <DataTable
          columns={columns as never}
          data={filteredInvoices}
          emptyMessage="No hay facturas disponibles"
        />
      )}
    </div>
  );
}
