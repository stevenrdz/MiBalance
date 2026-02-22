import { NextResponse } from "next/server";
import { profileSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export async function PATCH(request: Request) {
  try {
    const payload = await request.json();
    const parsed = profileSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de perfil.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name.trim(),
        monthly_income_goal: parsed.data.monthly_income_goal ?? 0
      })
      .eq("id", user.id);

    if (error) return apiValidationError(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}

