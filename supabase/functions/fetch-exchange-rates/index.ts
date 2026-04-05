import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

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

    const dolares: DolarApiResponse[] = await response.json();
    
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

    // Filtrar tasas válidas
    const validRates = rates.filter(r => r.rate > 0 && r.source === "oficial");

    if (validRates.length === 0) {
      console.log("No valid rates to insert");
      return new Response(
        JSON.stringify({
          success: true,
          rates,
          message: "No valid rates to insert"
        } as ExchangeRateResult),
        { headers: jsonHeaders }
      );
    }

    // Batch insert
    const insertData = validRates.map(rate => ({
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
