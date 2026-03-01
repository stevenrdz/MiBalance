import { NextResponse } from "next/server";
import { debtDocumentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const parsed = debtDocumentSchema.safeParse(payload);
    if (!parsed.success) {
      return apiValidationError("Documento de prestamo invalido.", parsed.error.flatten());
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data: debt } = await supabase
      .from("debts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();
    if (!debt) return apiValidationError("Deuda no encontrada.");

    const { data, error } = await supabase
      .from("debt_documents")
      .insert({
        user_id: user.id,
        debt_id: id,
        file_name: parsed.data.file_name,
        file_path: parsed.data.file_path,
        mime_type: parsed.data.mime_type,
        size_bytes: parsed.data.size_bytes
      })
      .select("id")
      .single();

    if (error) return apiValidationError(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
