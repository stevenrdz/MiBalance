import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return { supabase, user };
}

