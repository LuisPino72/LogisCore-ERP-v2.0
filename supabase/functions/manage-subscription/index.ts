import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action-context, x-user-permissions",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface RenewSubscriptionInput {
  subscriptionId: string;
  newPlanId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const rbacMiddleware = await createRbacMiddleware("ADMIN:SUBSCRIPTION");
    const rbacResult = await rbacMiddleware(req);

    if (!rbacResult.ok) {
      return new Response(
        JSON.stringify({ success: false, error: rbacResult.error.code }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const { tenantId } = rbacResult.data;

    let input: RenewSubscriptionInput;
    try {
      input = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!input.subscriptionId) {
      return new Response(
        JSON.stringify({ success: false, error: "subscriptionId es requerido" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (input.newPlanId) {
      const { data: renewData, error: renewError } = await supabase.rpc(
        "renew_subscription_with_plan",
        {
          p_subscription_id: input.subscriptionId,
          p_new_plan_id: input.newPlanId
        }
      );

      if (renewError) {
        return new Response(
          JSON.stringify({ success: false, error: renewError.message }),
          { status: 500, headers: jsonHeaders }
        );
      }

      const rows = renewData as { new_plan_name: string; new_end_date: string; new_status: string }[] | null;
      if (!rows || rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "No se recibió respuesta de la renovación" }),
          { status: 500, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            newPlanName: rows[0].new_plan_name,
            newEndDate: rows[0].new_end_date,
            status: rows[0].new_status
          }
        }),
        { status: 200, headers: jsonHeaders }
      );
    } else {
      const { error: renewError } = await supabase.rpc("renew_subscription", {
        p_subscription_id: input.subscriptionId
      });

      if (renewError) {
        return new Response(
          JSON.stringify({ success: false, error: renewError.message }),
          { status: 500, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: jsonHeaders }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});