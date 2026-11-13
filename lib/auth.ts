import { NextRequest } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { getUserRole, hasPermission } from "@/lib/access-control";

export async function getRequestUser(request: NextRequest): Promise<SupabaseUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await createSupabaseAuthClient().auth.getUser(token);
  return error ? null : data.user;
}

export function canAccessAdmin(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "VIEW_ADMIN_DASHBOARD");
}

export function canManageProducts(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "MANAGE_PRODUCTS");
}

export function canManageOrders(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "MANAGE_ORDERS");
}

export function canPlaceOrders(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "PLACE_ORDERS");
}

export function canViewOwnOrders(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "VIEW_OWN_ORDERS");
}

export function canManageItemRequests(email: string | null | undefined) {
  return hasPermission(getUserRole(email), "MANAGE_ITEM_REQUESTS");
}
