import { NextResponse } from "next/server";
import { debtPaymentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = debtPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de pago de deuda.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();
    if (debtError || !debt) return apiValidationError("Deuda no encontrada.");

    const { data, error } = await supabase
      .from("debt_payments")
      .insert({
        user_id: user.id,
        debt_id: id,
        payment_date: parsed.data.payment_date,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null
      })
      .select("id")
      .single();

    if (error) return apiValidationError(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}

