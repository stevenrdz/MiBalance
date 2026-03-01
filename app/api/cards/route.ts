import { NextResponse } from "next/server";
import { cardSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = cardSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de tarjeta.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data, error } = await supabase
      .from("cards")
      .insert({
        user_id: user.id,
        name: parsed.data.name.trim(),
        credit_limit: parsed.data.credit_limit,
        statement_day: parsed.data.statement_day,
        payment_day: parsed.data.payment_day,
        minimum_payment_amount: parsed.data.minimum_payment_amount || null,
        payment_due_date: parsed.data.payment_due_date || null,
        currency: "USD"
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo crear la tarjeta.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
