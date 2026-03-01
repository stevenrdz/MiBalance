import { NextResponse } from "next/server";
import { debtSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = debtSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de deuda.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const values = parsed.data;
    const { data, error } = await supabase
      .from("debts")
      .insert({
        user_id: user.id,
        type: values.type,
        creditor: values.creditor.trim(),
        principal: values.principal,
        start_date: values.start_date,
        term_months: values.term_months || null,
        installment_amount: values.installment_amount || null,
        payment_day: values.payment_day || null,
        current_installment: values.current_installment,
        interest_rate: values.interest_rate || null,
        notes: values.notes || null
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo crear la deuda.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
