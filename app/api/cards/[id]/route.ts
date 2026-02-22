import { NextResponse } from "next/server";
import { cardSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = cardSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de tarjeta.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { error } = await supabase
      .from("cards")
      .update({
        name: parsed.data.name.trim(),
        credit_limit: parsed.data.credit_limit,
        statement_day: parsed.data.statement_day,
        payment_day: parsed.data.payment_day
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) return apiValidationError(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { error } = await supabase
      .from("cards")
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) return apiValidationError(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}

