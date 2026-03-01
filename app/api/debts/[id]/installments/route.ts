import { addMonths, format, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import {
  debtInstallmentSchema,
  generateDebtInstallmentsSchema
} from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

function safeDueDate(startDate: string, offset: number, paymentDay: number | null) {
  const base = addMonths(parseISO(startDate), offset);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return format(
    new Date(base.getFullYear(), base.getMonth(), Math.min(paymentDay ?? base.getDate(), lastDay)),
    "yyyy-MM-dd"
  );
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data: debt, error: debtError } = await supabase
      .from("debts")
      .select("id, start_date, term_months, installment_amount, payment_day")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();
    if (debtError || !debt) return apiValidationError("Deuda no encontrada.");

    if (payload?.mode === "generate") {
      const parsed = generateDebtInstallmentsSchema.safeParse(payload);
      if (!parsed.success) {
        return apiValidationError("Datos inválidos para generar letras.", parsed.error.flatten());
      }
      if (!debt.term_months || !debt.installment_amount) {
        return apiValidationError("La deuda debe tener plazo y cuota mensual para generar letras.");
      }

      const rows = Array.from({ length: debt.term_months }, (_, index) => ({
        user_id: user.id,
        debt_id: id,
        document_id: parsed.data.document_id ?? null,
        installment_number: index + 1,
        due_date: safeDueDate(debt.start_date, index, debt.payment_day),
        scheduled_amount: debt.installment_amount
      }));

      const { error } = await supabase.from("debt_installments").upsert(rows, {
        onConflict: "debt_id,installment_number"
      });
      if (error) return apiValidationError("No se pudieron generar las letras.");
      return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
    }

    const parsed = debtInstallmentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de letra.", parsed.error.flatten());
    }

    const { data, error } = await supabase
      .from("debt_installments")
      .insert({
        user_id: user.id,
        debt_id: id,
        document_id: parsed.data.document_id ?? null,
        installment_number: parsed.data.installment_number,
        due_date: parsed.data.due_date,
        scheduled_amount: parsed.data.scheduled_amount,
        notes: parsed.data.notes ?? null
      })
      .select("id")
      .single();
    if (error) return apiValidationError("No se pudo registrar la letra.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
