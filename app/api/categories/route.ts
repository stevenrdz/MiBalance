import { NextResponse } from "next/server";
import { categorySchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de categoría.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: parsed.data.name.trim(),
        type: parsed.data.type,
        is_active: parsed.data.is_active
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo crear la categoría.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
