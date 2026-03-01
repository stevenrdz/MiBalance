import { NextResponse } from "next/server";
import { cardPaymentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = cardPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de pago de tarjeta.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();
    if (cardError || !card) return apiValidationError("Tarjeta no encontrada.");

    const { data, error } = await supabase
      .from("card_payments")
      .insert({
        user_id: user.id,
        card_id: id,
        date: parsed.data.date,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo registrar el pago de la tarjeta.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
