/**
 * Autentikasi pengguna — session cookie + role dari database.
 */
export type UserRole = "viewer" | "analyst" | "admin";

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "Viewer",
  analyst: "Analyst",
  admin: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  viewer: "PII disamarkan · tanpa SQL",
  analyst: "SQL read-only · export",
  admin: "Audit log · kelola metric",
};

export function rolePermissions(role: UserRole) {
  return {
    maskPII: role === "viewer",
    canQuerySQL: role === "analyst" || role === "admin",
    canViewAudit: role === "admin",
    canCertifyMetrics: role === "admin",
    canEditLayout: role !== "viewer",
    canExport: role !== "viewer",
  };
}

export function isUserRole(value: string): value is UserRole {
  return value === "viewer" || value === "analyst" || value === "admin";
}
