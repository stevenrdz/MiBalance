"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createBrowserClient(url, anonKey);
  return client;
}

