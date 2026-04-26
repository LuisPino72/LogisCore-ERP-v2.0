/**
 * Helper para decodificación de JWT en el cliente.
 * Permite extraer los claims inyectados por Supabase (role, tenant_id)
 * sin necesidad de dependencias pesadas.
 */

export interface LogisCoreJwtPayload {
  role?: string;
  tenant_id?: string;
  email?: string;
  sub?: string;
  exp?: number;
}

/**
 * Decodifica de forma segura la carga útil (payload) de un JWT.
 * @param token - El token JWT firmado.
 * @returns El payload decodificado o null si el token es inválido.
 */
export function decodeJwtPayload(token: string): LogisCoreJwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload) as LogisCoreJwtPayload;
  } catch (error) {
    console.error("Error decodificando JWT:", error);
    return null;
  }
}
