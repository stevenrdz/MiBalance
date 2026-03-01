import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { debtPaymentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const contentType = request.headers.get("content-type") ?? "";
    let payload: Record<string, FormDataEntryValue | null | undefined>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = {
        payment_date: formData.get("payment_date"),
        installment_number: formData.get("installment_number"),
        amount: formData.get("amount"),
        payment_method: formData.get("payment_method"),
        notes: formData.get("notes")
      };

      const receipt = formData.get("receipt");
      if (receipt instanceof File) {
        if (receipt.size > MAX_ATTACHMENT_SIZE_BYTES) {
          return apiValidationError("El comprobante excede el tamaño máximo de 5MB.");
        }

        const path = `${user.id}/debt-payments/${id}/${crypto.randomUUID()}-${receipt.name}`;
        const { error: uploadError } = await supabase.storage.from("attachments").upload(path, receipt, {
          cacheControl: "3600",
          upsert: false
        });
        if (uploadError) return apiValidationError("No se pudo subir el comprobante.");

        payload.receipt_file_name = receipt.name;
        payload.receipt_file_path = path;
        payload.receipt_mime_type = receipt.type;
        payload.receipt_size_bytes = String(receipt.size);
      }
    } else {
      payload = await request.json();
    }

    const parsed = debtPaymentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos de pago de deuda.", parsed.error.flatten());
    }

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
        installment_number: parsed.data.installment_number,
        amount: parsed.data.amount,
        payment_method: parsed.data.payment_method,
        notes: parsed.data.notes || null,
        receipt_file_name: parsed.data.receipt_file_name || null,
        receipt_file_path: parsed.data.receipt_file_path || null,
        receipt_mime_type: parsed.data.receipt_mime_type || null,
        receipt_size_bytes: parsed.data.receipt_size_bytes || null
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo registrar el pago de la deuda.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
