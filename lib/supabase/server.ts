import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { capCookieMaxAge } from "@/lib/auth-config";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, capCookieMaxAge(options)),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/** Returns the signed-in user's id, or throws. Use at the top of every Server Action. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Not signed in");
  return { supabase, userId };
}

/** Like requireUser, but also requires the super admin role (checked in the database). */
export async function requireSuperAdmin() {
  const { supabase, userId } = await requireUser();
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) throw new Error("Not allowed");
  return { supabase, userId };
}
