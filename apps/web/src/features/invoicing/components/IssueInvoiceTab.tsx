import { useState, useMemo } from "react";
import type { TaxRule } from "../types/invoicing.types";
import { Badge } from "@/common/components/Badge";
import { Alert } from "@/common/components/Alert";
import { Button } from "@/common/components/Button";
import { SearchInput } from "@/common/components/SearchInput";
import { Card } from "@/common/components/Card";
import { Input, Textarea } from "@/common";
import { FilePlus } from "lucide-react";

interface SaleForInvoice {
  localId: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  status: "draft" | "completed" | "voided" | "refunded";
  subtotal: number;
  taxTotal: number;
  igtfAmount?: number;
  total: number;
  createdAt: string;
}

interface IssueInvoiceTabProps {
  sales: SaleForInvoice[];
  taxRules: TaxRule[];
  onCreateInvoice: (input: { saleLocalId: string; customerName: string; customerRif: string; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
  lastError: string | null;
}

const rifRegex = /^[JGVEP]{1}[0-9]{9}$/;

export function IssueInvoiceTab({
  sales,
  taxRules,
  onCreateInvoice,
  isSubmitting,
  lastError,
}: IssueInvoiceTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerRif, setCustomerRif] = useState("");
  const [notes, setNotes] = useState("");

  const ivaRule = taxRules.find((r) => r.type === "iva" && r.isActive);
  const igtfRule = taxRules.find((r) => r.type === "igtf" && r.isActive);

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales.filter((s) => s.status === "completed");
    const term = searchTerm.toLowerCase();
    return sales.filter(
      (s) =>
        s.status === "completed" &&
        (s.localId.toLowerCase().includes(term) ||
          s.customerName?.toLowerCase().includes(term) ||
          s.customerRif?.toLowerCase().includes(term))
    );
  }, [sales, searchTerm]);

  const selectedSale = sales.find((s) => s.localId === selectedSaleId);

  const isValidRif = useMemo(() => {
    if (!customerRif) return true;
    return rifRegex.test(customerRif.toUpperCase());
  }, [customerRif]);

  const canSubmit = useMemo(() => {
    return (
      selectedSaleId.trim() &&
      customerName.trim() &&
      customerRif.trim() &&
      isValidRif
    );
  }, [selectedSaleId, customerName, customerRif, isValidRif]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    const input = {
      saleLocalId: selectedSaleId,
      customerName: customerName.trim(),
      customerRif: customerRif.toUpperCase().trim(),
    };
    
    if (notes.trim()) {
      (input as { notes?: string }).notes = notes.trim();
    }
    
    await onCreateInvoice(input);

    setSelectedSaleId("");
    setCustomerName("");
    setCustomerRif("");
    setNotes("");
    setSearchTerm("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="stack-md">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary">Emitir Factura</h3>
        <Badge variant="info">
          IVA: {ivaRule?.rate || 16}% | IGTF: {igtfRule?.rate || 3}%
        </Badge>
      </div>

      {lastError && (
        <Alert variant="error">{lastError}</Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="stack-sm">
          <label className="label flex items-center gap-2">
            Buscar Venta
          </label>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por ID, cliente o RIF..."
          />

          <div className="max-h-64 overflow-y-auto border border-surface-200 rounded-lg">
            {filteredSales.length === 0 ? (
              <div className="p-4 text-center text-content-tertiary">
                No hay ventas completadas
              </div>
            ) : (
              filteredSales.map((sale) => (
                <div
                  key={sale.localId}
                  onClick={() => {
                    setSelectedSaleId(sale.localId);
                    setCustomerName(sale.customerName || "");
                    setCustomerRif(sale.customerRif || "");
                  }}
                  className={`p-3 border-b border-surface-100 cursor-pointer hover:bg-surface-50 transition-colors ${
                    selectedSaleId === sale.localId
                      ? "bg-brand-50 border-l-4 border-l-brand-500"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm">
                        {sale.localId.slice(0, 8)}
                      </div>
                      <div className="font-medium text-sm">
                        {sale.customerName || "Sin cliente"}
                      </div>
                      <div className="text-xs text-content-tertiary">
                        {formatDate(sale.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">
                        {formatCurrency(sale.total)}
                      </div>
                      <Badge variant="success" className="text-xs">
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stack-md">
          <div>
            <label className="label">Datos del Cliente</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre o razón social"
              disabled={!selectedSaleId}
            />
          </div>

          <div>
            <label className="label">RIF del Cliente</label>
            <Input
              value={customerRif}
              onChange={(e) => setCustomerRif(e.target.value.toUpperCase())}
              placeholder="Ej: J123456789"
              className={customerRif && !isValidRif ? "border-state-error" : ""}
              disabled={!selectedSaleId}
              maxLength={10}
            />
            {customerRif && !isValidRif && (
              <p className="text-xs text-state-error mt-1">
                Formato RIF inválido. Use: J/G/V/E/P + 9 dígitos
              </p>
            )}
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de la factura..."
              className="min-h-[80px]"
              disabled={!selectedSaleId}
            />
          </div>

          {selectedSale && (
            <Card variant="filled">
              <div className="stack-sm">
                <div className="flex justify-between">
                  <span className="text-content-tertiary">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-tertiary">IVA ({ivaRule?.rate || 16}%):</span>
                  <span className="font-mono">{formatCurrency(selectedSale.taxTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-tertiary">IGTF ({igtfRule?.rate || 3}%):</span>
                  <span className="font-mono">{formatCurrency(selectedSale.igtfAmount || 0)}</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.total)}</span>
                </div>
              </div>
            </Card>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            variant="primary"
            className="w-full"
          >
            <FilePlus className="w-4 h-4" />
            {isSubmitting ? "Creando..." : "Crear Factura"}
          </Button>
        </div>
      </div>
    </div>
  );
}
