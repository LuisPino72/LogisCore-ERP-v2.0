export const AuthErrors = {
  SESSION_EXPIRED: {
    code: "AUTH_SESSION_EXPIRED",
    message: "Sesión ha expirado, debe iniciar sesión nuevamente",
    retryable: true,
  },
  TOKEN_INVALID: {
    code: "AUTH_TOKEN_INVALID",
    message: "Token inválido o malformado",
    retryable: false,
  },
  REFRESH_FAILED: {
    code: "AUTH_REFRESH_FAILED",
    message: "No se pudo refrescar la sesión",
    retryable: true,
  },
  SCOPE_DENIED: {
    code: "AUTH_SCOPE_DENIED",
    message: "No tiene el permiso requerido para esta acción",
    retryable: false,
  },
  TENANT_CONTEXT_MISSING: {
    code: "AUTH_TENANT_CONTEXT_MISSING",
    message: "Contexto de tenant requerido",
    retryable: false,
  },
  ACCOUNT_LOCKED: {
    code: "AUTH_ACCOUNT_LOCKED",
    message: "Cuenta bloqueada por 15 minutos",
    retryable: true,
  },
  REFRESH_TOKEN_INVALID: {
    code: "AUTH_REFRESH_TOKEN_INVALID",
    message: "Token de refresh inválido",
    retryable: false,
  },
  SIGNIN_FAILED: {
    code: "AUTH_SIGNIN_FAILED",
    message: "Credenciales inválidas",
    retryable: false,
  },
  SIGNOUT_FAILED: {
    code: "AUTH_SIGNOUT_FAILED",
    message: "Error al cerrar sesión",
    retryable: true,
  },
  RESET_PASSWORD_FAILED: {
    code: "AUTH_RESET_PASSWORD_FAILED",
    message: "Error al recuperar contraseña",
    retryable: true,
  },
  UPDATE_PASSWORD_FAILED: {
    code: "AUTH_UPDATE_PASSWORD_FAILED",
    message: "Error al actualizar contraseña",
    retryable: false,
  },
  USER_NOT_FOUND: {
    code: "AUTH_USER_NOT_FOUND",
    message: "Usuario no encontrado",
    retryable: false,
  },
  USER_INACTIVE: {
    code: "AUTH_USER_INACTIVE",
    message: "Usuario inactivo",
    retryable: false,
  },
} as const;

export type AuthErrorCode = keyof typeof AuthErrors;