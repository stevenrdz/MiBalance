import { NextResponse } from "next/server";
import { transactionSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = transactionSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos para actualizar transacción.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const values = parsed.data;
    const { data, error } = await supabase
      .from("transactions")
      .update({
        date: values.date,
        type: values.type,
        amount: values.amount,
        category_id: values.category_id,
        payment_method: values.payment_method,
        card_id: values.payment_method === "card" ? values.card_id : null,
        merchant: values.merchant || null,
        description: values.description || null
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo actualizar la transacción.");
    return NextResponse.json(data);
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
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) return apiValidationError("No se pudo eliminar la transacción.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}
