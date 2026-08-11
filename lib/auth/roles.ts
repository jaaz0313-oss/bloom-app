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

export function isAdminRole(role: string | null | undefined): role is UserRole {
  return role?.trim().toLowerCase() === "admin";
}

export function canEditDirectorio(role: UserRole | string): boolean {
  const normalized = role?.trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "lider" ||
    normalized === "coordinadora" ||
    normalized === "finanzas"
  );
}

export function canDeactivateDirectorio(role: UserRole | string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "admin" || normalized === "lider";
}

export function canManageBodaEstado(role: UserRole | string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "admin" || normalized === "lider";
}

/** Preferencias del portal cliente (USD / Excel) solo para admin y líder. */
export function canManageClientePortalFlags(role: UserRole | string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "admin" || normalized === "lider";
}

/** Leads visibles solo para admin y líder. */
export function canViewLeads(role: UserRole | string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "admin" || normalized === "lider";
}
