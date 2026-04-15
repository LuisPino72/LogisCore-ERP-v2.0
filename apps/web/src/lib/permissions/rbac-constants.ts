export const PERMISSIONS = {
  SALES: {
    POS: "SALES:POS",
    VOID: "SALES:VOID",
    REFUND: "SALES:REFUND",
    DISCOUNT: "SALES:DISCOUNT",
  },
  INVENTORY: {
    VIEW: "INVENTORY:VIEW",
    ADJUST: "INVENTORY:ADJUST",
    COUNT: "INVENTORY:COUNT",
  },
  PURCHASES: {
    ORDER: "PURCHASES:ORDER",
    RECEIVE: "PURCHASES:RECEIVE",
    SUPPLIERS: "PURCHASES:SUPPLIERS",
  },
  INVOICE: {
    ISSUE: "INVOICE:ISSUE",
    VOID: "INVOICE:VOID",
  },
  PRODUCTION: {
    ORDER: "PRODUCTION:ORDER",
    RECIPE: "PRODUCTION:RECIPE",
  },
  REPORTS: {
    VIEW: "REPORTS:VIEW",
    EXPORT: "REPORTS:EXPORT",
  },
  ADMIN: {
    USERS: "ADMIN:USERS",
    TENANT: "ADMIN:TENANT",
    SUBSCRIPTION: "ADMIN:SUBSCRIPTION",
  },
} as const;

export const DEFAULT_EMPLOYEE_PERMISSIONS = [
  PERMISSIONS.SALES.POS,
] as const;

export const PERMISSION_MODULES = Object.keys(PERMISSIONS) as readonly [
  "SALES",
  "INVENTORY",
  "PURCHASES",
  "INVOICE",
  "PRODUCTION",
  "REPORTS",
  "ADMIN"
];

export function getPermissionsByModule(module: keyof typeof PERMISSIONS): readonly string[] {
  return Object.values(PERMISSIONS[module]);
}

export function allPermissions(): string[] {
  return Object.values(PERMISSIONS).flatMap(m => Object.values(m));
}

export function isValidPermission(permission: string): boolean {
  return allPermissions().includes(permission);
}