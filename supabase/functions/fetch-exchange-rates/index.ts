import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.23.8";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://logiscore-erp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const DolarApiSchema = z.object({
  fuente: z.string(),
  nombre: z.string(),
  compra: z.number().nullable(),
  venta: z.number().nullable(),
  promedio: z.number().nullable()
});

const ExchangeRateSchema = z.object({
  source: z.string(),
  name: z.string(),
  rate: z.number().positive(),
  type: z.enum(["compra", "venta"]),
  fetchedAt: z.string().datetime()
});

const ExchangeRateResultSchema = z.object({
  success: z.boolean(),
  rates: z.array(ExchangeRateSchema),
  error: z.string().optional()
});

interface DolarApiResponse {
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number | null;
}

interface ExchangeRateResult {
  success: boolean;
  rates: Array<{
    source: string;
    name: string;
    rate: number;
    type: "compra" | "venta";
    fetchedAt: string;
  }>;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const response = await fetch("https://ve.dolarapi.com/v1/dolares");
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Validate incoming API data with Zod (Fase 3)
    const parseResult = z.array(DolarApiSchema).safeParse(rawData);
    
    if (!parseResult.success) {
      console.error("[FETCH-RATES] Schema validation failed:", parseResult.error.flatten());
      return new Response(
        JSON.stringify({
          success: false,
          rates: [],
          error: "EXTERNAL_API_SCHEMA_INVALID: Data shape from BCV API does not match expected schema"
        } as z.infer<typeof ExchangeRateResultSchema>),
        { status: 502, headers: jsonHeaders }
      );
    }
    
    const dolares: DolarApiResponse[] = parseResult.data;
    
    const rates: ExchangeRateResult["rates"] = dolares.map((d) => ({
      source: d.fuente,
      name: d.nombre,
      rate: d.promedio || d.venta || d.compra || 0,
      type: d.venta ? "venta" : "compra",
      fetchedAt: new Date().toISOString()
    }));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    console.log(`Fetching rates from ve.dolarapi.com, found ${rates.length} rates`);
    console.log(`Rates data:`, JSON.stringify(rates));

    // Filtrar tasas válidas (solo oficial)
    const validRates = rates.filter(r => r.rate > 0 && r.source === "oficial");

    // Additional fiscal sanity check: Venezuelan BS rate should be reasonable (not negative, not zero, not absurdly high)
    // Historical valid range: 10-2000 Bs per USD (adjusted for hyperinflation context)
    const sanitizedRates = validRates.map(r => ({
      ...r,
      rate: Math.round(r.rate * 10000) / 10000 // Ensure 4-decimal precision for fiscal accuracy
    })).filter(r => r.rate > 10 && r.rate < 5000); // Sanity bounds for VES exchange rate

    if (sanitizedRates.length === 0) {
      console.log("No valid rates to insert after sanitization");
      return new Response(
        JSON.stringify({
          success: true,
          rates: sanitizedRates,
          message: "No valid rates to insert after sanitization"
        } as ExchangeRateResult),
        { headers: jsonHeaders }
      );
    }

    // BORRAR tasas oficiales anteriores antes de insertar nueva
    const { error: deleteError } = await supabase
      .from("exchange_rates")
      .delete()
      .eq("source", "oficial");

    if (deleteError) {
      console.error("Error deleting old rates:", deleteError.message);
    } else {
      console.log("Deleted old official exchange rates");
    }

    // Insertar nueva tasa
    const insertData = sanitizedRates.map(rate => ({
      local_id: crypto.randomUUID(),
      from_currency: "USD",
      to_currency: "VES",
      rate: rate.rate,
      source: rate.source,
      jurisdiction: "VE",
      valid_from: now.toISOString()
    }));

    console.log(`Inserting ${insertData.length} rates:`, JSON.stringify(insertData));

    const { error } = await supabase
      .from("exchange_rates")
      .insert(insertData);

    if (error) {
      console.error("Error inserting rates:", error.message);
      return new Response(
        JSON.stringify({
          success: false,
          rates: [],
          error: error.message
        } as ExchangeRateResult),
        { status: 500, headers: jsonHeaders }
      );
    }

    console.log(`Successfully inserted ${insertData.length} rates`);

    return new Response(
      JSON.stringify({
        success: true,
        rates,
        message: `Fetched ${rates.length} exchange rates`
      } as ExchangeRateResult),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        rates: [],
        error: String(error)
      } as ExchangeRateResult),
      { status: 500, headers: jsonHeaders }
    );
  }
});
