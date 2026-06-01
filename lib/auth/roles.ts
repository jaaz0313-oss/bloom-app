export type UserRole = "admin" | "lider" | "coordinadora" | "finanzas";

export type Permission =
  | "weddings.create"
  | "weddings.delete"
  | "leads.create"
  | "providers.manage"
  | "providers.delete"
  | "cronograma.manage"
  | "payments.manage"
  | "finanzas.view"
  | "whatsapp.send"
  | "users.manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "weddings.create",
    "weddings.delete",
    "leads.create",
    "providers.manage",
    "providers.delete",
    "cronograma.manage",
    "payments.manage",
    "finanzas.view",
    "whatsapp.send",
    "users.manage",
  ],
  lider: [
    "weddings.create",
    "leads.create",
    "providers.manage",
    "cronograma.manage",
    "finanzas.view",
    "whatsapp.send",
    "payments.manage",
  ],
  coordinadora: [
    "providers.manage",
    "cronograma.manage",
    "finanzas.view",
    "whatsapp.send",
    "payments.manage",
  ],
  finanzas: ["payments.manage", "finanzas.view", "whatsapp.send"],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  lider: "Lider",
  coordinadora: "Coordinadora",
  finanzas: "Finanzas",
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}
