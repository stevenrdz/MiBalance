"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig, SUPABASE_AUTH_COOKIE_NAME } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  const { url, anonKey } = getSupabaseBrowserConfig();
  client = createBrowserClient(url, anonKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_COOKIE_NAME
    }
  });
  return client;
}
