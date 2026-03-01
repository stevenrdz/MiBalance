import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseServerConfig, SUPABASE_AUTH_COOKIE_NAME } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseServerConfig();

  return createServerClient(url, anonKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_COOKIE_NAME
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // In server components Next.js may block cookie mutations.
        }
      }
    }
  });
}
