import { NextRequest } from "next/server";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export async function getRequestUser(request: NextRequest): Promise<SupabaseUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;

  const { data, error } = await createSupabaseAuthClient().auth.getUser(token);
  return error ? null : data.user;
}

export function isAdminEmail(email: string | undefined) {
  if (!email) return false;
  const administrators = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  return administrators.includes(email.toLowerCase());
}
