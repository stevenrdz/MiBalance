import { NextResponse } from "next/server";
import { debtSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = debtSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de deuda.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const values = parsed.data;
    const { error } = await supabase
      .from("debts")
      .update({
        type: values.type,
        creditor: values.creditor.trim(),
        principal: values.principal,
        start_date: values.start_date,
        term_months: values.term_months || null,
        interest_rate: values.interest_rate || null,
        notes: values.notes || null
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
      .from("debts")
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

