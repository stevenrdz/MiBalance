import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { settleDebtInstallmentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string; installmentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id, installmentId } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const contentType = request.headers.get("content-type") ?? "";
    let payload: Record<string, FormDataEntryValue | null | undefined>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = {
        status: formData.get("status"),
        paid_amount: formData.get("paid_amount"),
        paid_at: formData.get("paid_at"),
        payment_method: formData.get("payment_method"),
        notes: formData.get("notes")
      };

      const receipt = formData.get("receipt");
      if (receipt instanceof File) {
        if (receipt.size > MAX_ATTACHMENT_SIZE_BYTES) {
          return apiValidationError("El comprobante excede el tamaño máximo de 5MB.");
        }

        const path = `${user.id}/debt-installments/${id}/${crypto.randomUUID()}-${receipt.name}`;
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

    const parsed = settleDebtInstallmentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Datos inválidos para confirmar la letra.", parsed.error.flatten());
    }

    const { data: installment, error: installmentError } = await supabase
      .from("debt_installments")
      .select("id, installment_number")
      .eq("id", installmentId)
      .eq("debt_id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();
    if (installmentError || !installment) return apiValidationError("Letra no encontrada.");

    const values = parsed.data;
    const { error } = await supabase
      .from("debt_installments")
      .update({
        status: values.status,
        paid_amount: values.paid_amount,
        paid_at: values.paid_at || null,
        payment_method: values.payment_method || null,
        notes: values.notes || null,
        receipt_file_name: values.receipt_file_name || null,
        receipt_file_path: values.receipt_file_path || null,
        receipt_mime_type: values.receipt_mime_type || null,
        receipt_size_bytes: values.receipt_size_bytes || null
      })
      .eq("id", installmentId)
      .eq("user_id", user.id);
    if (error) return apiValidationError("No se pudo actualizar la letra.");

    if (values.paid_amount > 0 && values.paid_at) {
      const { error: paymentError } = await supabase.from("debt_payments").insert({
        user_id: user.id,
        debt_id: id,
        installment_number: installment.installment_number,
        payment_date: values.paid_at,
        amount: values.paid_amount,
        payment_method: values.payment_method || null,
        notes: values.notes || null,
        receipt_file_name: values.receipt_file_name || null,
        receipt_file_path: values.receipt_file_path || null,
        receipt_mime_type: values.receipt_mime_type || null,
        receipt_size_bytes: values.receipt_size_bytes || null
      });
      if (paymentError) return apiValidationError("No se pudo registrar el pago de la letra.");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}
