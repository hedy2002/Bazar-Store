import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getServerUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
    },
  });
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
