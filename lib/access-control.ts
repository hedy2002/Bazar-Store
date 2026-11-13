export const userRoles = ["STORE_OWNER", "SHOP_OWNER"] as const;
export type UserRole = (typeof userRoles)[number];

export const permissions = [
  "VIEW_CATALOG",
  "SEARCH_CATALOG",
  "PLACE_ORDERS",
  "VIEW_OWN_ORDERS",
  "CREATE_ITEM_REQUESTS",
  "VIEW_ADMIN_DASHBOARD",
  "MANAGE_PRODUCTS",
  "MANAGE_ORDERS",
  "MANAGE_ITEM_REQUESTS",
] as const;
export type Permission = (typeof permissions)[number];

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  STORE_OWNER: new Set([
    "VIEW_CATALOG",
    "VIEW_ADMIN_DASHBOARD",
    "MANAGE_PRODUCTS",
    "MANAGE_ORDERS",
    "MANAGE_ITEM_REQUESTS",
  ]),
  SHOP_OWNER: new Set([
    "VIEW_CATALOG",
    "SEARCH_CATALOG",
    "PLACE_ORDERS",
    "VIEW_OWN_ORDERS",
    "CREATE_ITEM_REQUESTS",
  ]),
};

export function getUserRole(email: string | null | undefined): UserRole | null {
  if (!email) return null;

  const storeOwners = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);

  return storeOwners.includes(email.toLowerCase()) ? "STORE_OWNER" : "SHOP_OWNER";
}

export function hasPermission(
  role: UserRole | null,
  permission: Permission,
): boolean {
  return role !== null && rolePermissions[role].has(permission);
}
