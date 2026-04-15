/**
 * Panel Maestro de Reportes - Centro de Inteligencia y Auditoría.
 * Proporciona análisis de ventas, inventario, finanzas, cajas y auditoría.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import type { ReportsActorContext, ReportsKpis, SaleWithDetails, KardexEntryExtended, FinanceReport, BalanceSheetReport, BoxClosingSummary, AuditLogWithUser, CashFlowReport } from "../types/reports.types";
import { eventBus } from "@/lib/core/runtime";
import { reportsService } from "../services/reports.service.instance";
import { ReportsKpiHeader } from "./ReportsKpiHeader";
import { SalesReportsTab } from "./SalesReportsTab";
import { KardexTab } from "./KardexTab";
import { FinanceTab } from "./FinanceTab";
import { BoxReportsTab } from "./BoxReportsTab";
import { AuditTab } from "./AuditTab";
import { BalanceTab } from "./BalanceTab";
import { CashFlowTab } from "./CashFlowTab";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { AlertCircle } from "lucide-react";

interface ReportsPanelProps {
  tenantSlug: string;
  actor: ReportsActorContext;
  warehouses?: { localId: string; name: string }[];
}

const defaultWarehouses = [
  { localId: "default-warehouse", name: "Bodega Principal" },
];

export function ReportsPanel({ tenantSlug, actor, warehouses = defaultWarehouses }: ReportsPanelProps) {
  const [, setActiveTab] = useState("sales");
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<ReportsKpis | null>(null);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [kardex, setKardex] = useState<KardexEntryExtended[]>([]);
  const [financeReports, setFinanceReports] = useState<FinanceReport[]>([]);
  const [balanceReports, setBalanceReports] = useState<BalanceSheetReport[]>([]);
  const [cashFlowReports, setCashFlowReports] = useState<CashFlowReport[]>([]);
  const [boxClosings, setBoxClosings] = useState<BoxClosingSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithUser[]>([]);

  const canViewAudit = actor.role === "owner" || actor.role === "admin";

  const loadKpis = useCallback(async () => {
    const result = await reportsService.getReportsKpis({ tenantSlug });
    if (result.ok) {
      setKpis(result.data);
    }
  }, [tenantSlug]);

  const loadSales = useCallback(async () => {
    const result = await reportsService.listSalesWithDetails({ tenantSlug });
    if (result.ok) {
      setSales(result.data);
    }
  }, [tenantSlug]);

  const loadKardex = useCallback(async () => {
    const result = await reportsService.getKardexWithLayers({ tenantSlug });
    if (result.ok) {
      setKardex(result.data);
    }
  }, [tenantSlug]);

  const loadFinance = useCallback(async () => {
    const result = await reportsService.getFinanceReport({ tenantSlug });
    if (result.ok) {
      setFinanceReports(result.data);
    }
  }, [tenantSlug]);

  const loadBalance = useCallback(async () => {
    const result = await reportsService.getBalanceSheet({ tenantSlug });
    if (result.ok) {
      setBalanceReports(result.data);
    }
  }, [tenantSlug]);

  const loadCashFlow = useCallback(async () => {
    const result = await reportsService.getCashFlowReport({ tenantSlug });
    if (result.ok) {
      setCashFlowReports(result.data);
    }
  }, [tenantSlug]);

  const loadBoxClosings = useCallback(async () => {
    const result = await reportsService.getBoxClosings({ tenantSlug });
    if (result.ok) {
      setBoxClosings(result.data);
    }
  }, [tenantSlug]);

  const loadAuditLogs = useCallback(async () => {
    if (!canViewAudit) return;
    const result = await reportsService.getAuditLogs({ tenantSlug }, actor);
    if (result.ok) {
      setAuditLogs(result.data as AuditLogWithUser[]);
    }
  }, [tenantSlug, actor, canViewAudit]);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
      await Promise.all([
        loadKpis(),
        loadSales(),
        loadKardex(),
        loadFinance(),
        loadBalance(),
        loadCashFlow(),
        loadBoxClosings(),
        canViewAudit ? loadAuditLogs() : Promise.resolve()
      ]);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : "Error al cargar reportes");
    } finally {
      setIsLoading(false);
    }
  }, [loadKpis, loadSales, loadKardex, loadFinance, loadBalance, loadCashFlow, loadBoxClosings, loadAuditLogs, canViewAudit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const offAudit = eventBus.on("SECURITY.AUDIT_LOG_CREATED", () => {
      void loadAuditLogs();
      void loadKpis();
    });
    return () => {
      offAudit();
    };
  }, [loadAuditLogs, loadKpis]);

  const tabs: TabItem[] = useMemo(() => {
    const items: TabItem[] = [
      {
        id: "sales",
        label: "Ventas",
        content: (
          <SalesReportsTab
            sales={sales}
            isLoading={isLoading}
            warehouses={warehouses}
          />
        )
      },
      {
        id: "inventory",
        label: "Inventario (Kardex)",
        content: (
          <KardexTab
            kardex={kardex}
            isLoading={isLoading}
            warehouses={warehouses}
          />
        )
      },
      {
        id: "finance",
        label: "Finanzas",
        content: (
          <FinanceTab
            financeReports={financeReports}
            isLoading={isLoading}
          />
        )
      },
      {
        id: "balance",
        label: "Balance",
        content: (
          <BalanceTab
            balanceReports={balanceReports}
            isLoading={isLoading}
          />
        )
      },
      {
        id: "cashflow",
        label: "Flujo de Caja",
        content: (
          <CashFlowTab
            cashFlowReports={cashFlowReports}
            isLoading={isLoading}
          />
        )
      },
      {
        id: "box",
        label: "Cajas",
        content: (
          <BoxReportsTab
            boxClosings={boxClosings}
            isLoading={isLoading}
          />
        )
      }
    ];

    if (canViewAudit) {
      items.push({
        id: "audit",
        label: "Auditoría",
        content: (
          <AuditTab
            auditLogs={auditLogs}
            isLoading={isLoading}
          />
        )
      });
    }

    return items;
  }, [sales, kardex, financeReports, balanceReports, cashFlowReports, boxClosings, auditLogs, isLoading, warehouses, canViewAudit]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-content-primary">Centro de Inteligencia</h2>
        <p className="text-content-secondary mt-1">
          Reportes y análisis para la toma de decisiones
        </p>
      </div>

      {lastError && (
        <div className="alert alert-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{lastError}</span>
        </div>
      )}

      <ReportsKpiHeader kpis={kpis} isLoading={isLoading} />

      <Tabs
        items={tabs}
        defaultTab="sales"
        variant="underline"
        onChange={setActiveTab}
      />
    </section>
  );
}
