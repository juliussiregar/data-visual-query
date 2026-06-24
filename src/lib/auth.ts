/**
 * Autentikasi pengguna — session cookie.
 * Tidak ada pembatasan per-role: user yang login punya akses penuh ke project miliknya.
 */
export type UserRole = "viewer" | "analyst" | "admin";

/** @deprecated Kolom legacy di database; tidak memengaruhi izin. */
export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "User",
  analyst: "User",
  admin: "User",
};

export function rolePermissions(_role?: UserRole) {
  return {
    maskPII: false,
    canQuerySQL: true,
    canViewAudit: true,
    canCertifyMetrics: true,
    canEditLayout: true,
    canExport: true,
  };
}

export function isUserRole(value: string): value is UserRole {
  return value === "viewer" || value === "analyst" || value === "admin";
}
