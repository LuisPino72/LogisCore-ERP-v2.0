import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface CommissionInput {
  tenantSlug: string;
  saleLocalId: string;
  salesPersonId: string;
  totalAmount: number;
}

interface CommissionResult {
  success: boolean;
  commission_amount: number;
  commission_rate: number;
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: jsonHeaders }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const input: CommissionInput = await req.json();

    if (!input.saleLocalId || !input.salesPersonId || !input.totalAmount) {
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", message: "Faltan campos requeridos" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: salesCommissions, error: commissionError } = await supabase
      .from("sales_commissions")
      .select("*")
      .eq("tenant_slug", input.tenantSlug)
      .eq("sales_person_id", input.salesPersonId)
      .lte("start_date", new Date().toISOString())
      .or("end_date.is.null,end_date.gte." + new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (commissionError || !salesCommissions || salesCommissions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          commission_amount: 0,
          commission_rate: 0,
          message: "No hay configuración de comisión para este vendedor"
        } as CommissionResult),
        { headers: jsonHeaders }
      );
    }

    const commissionConfig = salesCommissions[0];
    let commissionAmount = 0;
    let appliedRate = 0;

    if (commissionConfig.commission_type === "percentage") {
      appliedRate = commissionConfig.rate || 0;
      commissionAmount = (input.totalAmount * appliedRate) / 100;
    } else if (commissionConfig.commission_type === "fixed") {
      commissionAmount = commissionConfig.fixed_amount || 0;
      appliedRate = (commissionAmount / input.totalAmount) * 100;
    } else if (commissionConfig.commission_type === "tiered") {
      const tiers = commissionConfig.tiers || [];
      const tier = tiers.find((t: { min_amount: number; max_amount: number; rate: number }) =>
        input.totalAmount >= t.min_amount && input.totalAmount <= t.max_amount
      );
      if (tier) {
        appliedRate = tier.rate;
        commissionAmount = (input.totalAmount * appliedRate) / 100;
      }
    }

    commissionAmount = Math.round((commissionAmount + Number.EPSILON) * 100) / 100;

    return new Response(
      JSON.stringify({
        success: true,
        commission_amount: commissionAmount,
        commission_rate: Math.round((appliedRate + Number.EPSILON) * 100) / 100
      } as CommissionResult),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
