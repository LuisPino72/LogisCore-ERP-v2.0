export const VALIDATION_RULES = {
  MAX_TEXT_LENGTH: 20,
  PHONE_LENGTH: 11,
  SLUG_MAX_LENGTH: 20,
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const VALIDATIONS = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  RIF_REGEX: /^[JGVECP]-[0-9]{9}$/,
  CEDULA_REGEX: /^[VEGJ]-[0-9]{8}$/,
  PHONE_REGEX: /^[0-9]{11}$/,
  SLUG_REGEX: /^[a-z0-9-]+$/,
};

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: "El email es requerido" };
  }
  if (!VALIDATIONS.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: "Formato de email inválido" };
  }
  return { isValid: true };
}

export function validateRif(rif: string): ValidationResult {
  if (!rif || rif.trim() === "") {
    return { isValid: true };
  }
  if (!VALIDATIONS.RIF_REGEX.test(rif.toUpperCase())) {
    return { isValid: false, error: "Formato RIF inválido. Ej: J-123456789" };
  }
  return { isValid: true };
}

export function validateCedula(cedula: string): ValidationResult {
  if (!cedula || cedula.trim() === "") {
    return { isValid: true };
  }
  if (!VALIDATIONS.CEDULA_REGEX.test(cedula.toUpperCase())) {
    return { isValid: false, error: "Formato de cédula inválido. Ej: V-12345678" };
  }
  return { isValid: true };
}

export function validateMaxLength(value: string, maxLength: number = VALIDATION_RULES.MAX_TEXT_LENGTH): ValidationResult {
  if (!value) {
    return { isValid: true };
  }
  if (value.length > maxLength) {
    return { isValid: false, error: `Máximo ${maxLength} caracteres permitidos` };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === "") {
    return { isValid: true };
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length !== VALIDATION_RULES.PHONE_LENGTH) {
    return { isValid: false, error: `El teléfono debe tener ${VALIDATION_RULES.PHONE_LENGTH} dígitos` };
  }
  return { isValid: true };
}

export function validateSlug(slug: string): ValidationResult {
  if (!slug) {
    return { isValid: false, error: "El slug es requerido" };
  }
  if (slug.length > VALIDATION_RULES.SLUG_MAX_LENGTH) {
    return { isValid: false, error: `Máximo ${VALIDATION_RULES.SLUG_MAX_LENGTH} caracteres permitidos` };
  }
  if (!VALIDATIONS.SLUG_REGEX.test(slug)) {
    return { isValid: false, error: "Solo letras minúsculas, números y guiones" };
  }
  return { isValid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === "") {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  return { isValid: true };
}

export function validateForm(
  data: Record<string, string>,
  rules: Record<string, (value: string) => ValidationResult>
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field] || "");
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
}

export const TOAST_MESSAGES = {
  CREATE_SUCCESS: "Tenant creado exitosamente",
  CREATE_ERROR: "Error al crear el tenant",
  UPDATE_SUCCESS: "Tenant actualizado exitosamente",
  UPDATE_ERROR: "Error al actualizar el tenant",
  DELETE_SUCCESS: "Tenant eliminado exitosamente",
  DELETE_ERROR: "Error al eliminar el tenant",
  DELETE_CONFIRM: "¿Estás seguro de que deseas eliminar este tenant?",
  REQUIRED_FIELD: "Este campo es requerido",
  INVALID_EMAIL: "Email inválido",
  INVALID_RIF: "Formato RIF inválido (ej: J-123456789)",
  INVALID_CEDULA: "Formato de cédula inválido (ej: V-12345678)",
  INVALID_PHONE: "El teléfono debe tener 11 dígitos",
  MAX_LENGTH: (max: number) => `Máximo ${max} caracteres permitidos`,
  INVALID_SLUG: "Solo letras minúsculas, números y guiones",
};

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: "La contraseña es requerida" };
  }
  if (password.length < 6) {
    return { isValid: false, error: "Mínimo 6 caracteres permitidos" };
  }
  return { isValid: true };
}