function required(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export const SUPABASE_AUTH_COOKIE_NAME = "sb-mibalance-auth-token";

function getAnonKey() {
  return required(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseBrowserConfig(): SupabaseConfig {
  return {
    // Use static env references so Next.js can inline them in client bundles.
    url: required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getAnonKey()
  };
}

export function getSupabaseServerConfig(): SupabaseConfig {
  const publicUrl = required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  return {
    // In Docker dev the app container may need a different host than the browser.
    url: process.env.SUPABASE_INTERNAL_URL || publicUrl,
    anonKey: getAnonKey()
  };
}
