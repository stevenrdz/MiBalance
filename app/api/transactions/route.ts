import { NextResponse } from "next/server";
import { transactionSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = transactionSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos para la transacción.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const values = parsed.data;
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        date: values.date,
        type: values.type,
        amount: values.amount,
        category_id: values.category_id,
        payment_method: values.payment_method,
        card_id: values.payment_method === "card" ? values.card_id : null,
        merchant: values.merchant || null,
        description: values.description || null
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo crear la transacción.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
