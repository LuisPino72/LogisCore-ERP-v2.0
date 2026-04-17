import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

interface MiddlewareContext {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "employee";
  permissions: string[];
  actionRequired: string;
}

interface SuccessResult<T> {
  ok: true;
  data: T;
}

interface ErrorResult<E> {
  ok: false;
  error: E;
}

type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

function createAppError(params: {
  code: string;
  message?: string;
  context?: Record<string, unknown>;
}): AppError {
  return {
    code: params.code,
    message: params.message ?? "Error desconocido",
    context: params.context
  };
}

function ok<T>(data: T): SuccessResult<T> {
  return { ok: true, data };
}

function err<E>(error: E): ErrorResult<E> {
  return { ok: false, error };
}

function parsePermissions(permInput: string | null): string[] {
  if (!permInput) return [];
  try {
    const parsed = JSON.parse(permInput);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createRbacMiddleware(requiredPermission: string) {
  return async (req: Request): Promise<Result<MiddlewareContext, AppError>> => {
    const authHeader = req.headers.get("Authorization");
    const actionContext = req.headers.get("X-Action-Context");
    const userPermsHeader = req.headers.get("X-User-Permissions");

    if (!authHeader?.startsWith("Bearer ")) {
      return err(createAppError({
        code: "MISSING_BEARER_TOKEN",
        message: "Token de autorización no proporcionado"
      }));
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return err(createAppError({
        code: "INVALID_JWT",
        message: "Token JWT inválido o expirado"
      }));
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("tenant_id, role, permissions")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (roleError) {
      return err(createAppError({
        code: "ROLE_QUERY_FAILED",
        message: "Error al consultar rol del usuario",
        context: { originalError: roleError.message }
      }));
    }

    if (!roleRow) {
      return err(createAppError({
        code: "FORBIDDEN_NO_ROLE",
        message: "El usuario no tiene un rol activo asignado"
      }));
    }

    const userPermissions = parsePermissions(userPermsHeader);
    const dbPermissions = roleRow.permissions?.permissions ?? [];

    const finalPermissions = userPermissions.length > 0 ? userPermissions : dbPermissions;

    const isAdminOrOwner = roleRow.role === "admin" || roleRow.role === "owner";
    const hasPermission = isAdminOrOwner || finalPermissions.includes(requiredPermission);

    if (!hasPermission) {
      return err(createAppError({
        code: "PERMISSION_DENIED",
        message: `Permiso '${requiredPermission}' requerido para esta acción`,
        context: {
          required: requiredPermission,
          actionContext: actionContext ?? requiredPermission,
          userPermissions: finalPermissions
        }
      }));
    }

    return ok({
      userId: user.id,
      tenantId: roleRow.tenant_id,
      role: roleRow.role as "owner" | "admin" | "employee",
      permissions: finalPermissions,
      actionRequired: actionContext ?? requiredPermission
    });
  };
}

export type { MiddlewareContext, AppError, Result };