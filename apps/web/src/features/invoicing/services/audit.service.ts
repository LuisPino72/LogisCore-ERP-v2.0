import { ok, type AppError, type Result } from "@logiscore/core";
import { supabase } from "@/lib/supabase/client";

export interface LogPdfExportParams {
  invoiceId: string;
  invoiceNumber: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const logPdfExport = async (
  params: LogPdfExportParams
): Promise<Result<void, AppError>> => {
  try {
    const sessionResponse = await supabase?.auth.getSession();
    const accessToken = sessionResponse?.data.session?.access_token;

    if (!accessToken || !supabaseUrl) {
      return ok(undefined);
    }

    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/functions/v1/audit-log`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {})
        },
        body: JSON.stringify({
          action: "INVOICE_PDF_EXPORTED",
          targetTable: "invoices",
          targetId: params.invoiceId,
          metadata: {
            invoiceNumber: params.invoiceNumber,
            status: "success",
            timestamp: new Date().toISOString()
          }
        })
      }
    );

    if (!response.ok) {
      console.warn("Audit log failed:", response.status);
    }

    return ok(undefined);
  } catch (cause) {
    console.warn("Audit log error:", cause);
    return ok(undefined);
  }
};