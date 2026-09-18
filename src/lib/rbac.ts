import { AuthSession } from "./auth";

export function hasPermission(session: AuthSession | null, permissionCode: string): boolean {
  if (!session) return false;
  if (session.roles.includes("SUPER_ADMIN")) return true;
  return session.permissions.includes(permissionCode);
}

export function hasRole(session: AuthSession | null, roleName: string): boolean {
  if (!session) return false;
  if (session.roles.includes("SUPER_ADMIN")) return true;
  return session.roles.includes(roleName);
}