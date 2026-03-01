import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { debtDocumentSchema } from "@/lib/schemas/domain";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
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

    const contentType = request.headers.get("content-type") ?? "";
    let parsed:
      | { file_name: string; file_path: string; mime_type: string; size_bytes: number }
      | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("file");
      if (!(fileEntry instanceof File)) {
        return apiValidationError("Debes enviar un archivo válido.");
      }
      if (fileEntry.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return apiValidationError("El documento excede el tamaño máximo de 5MB.");
      }

      const path = `${user.id}/debt-documents/${id}/${crypto.randomUUID()}-${fileEntry.name}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, fileEntry, {
          cacheControl: "3600",
          upsert: false
        });
      if (uploadError) return apiValidationError("No se pudo subir el documento.");

      parsed = {
        file_name: fileEntry.name,
        file_path: path,
        mime_type: fileEntry.type,
        size_bytes: fileEntry.size
      };
    } else {
      const payload = await request.json();
      const schemaResult = debtDocumentSchema.safeParse(payload);
      if (!schemaResult.success) {
        return apiValidationError("Documento de préstamo inválido.", schemaResult.error.flatten());
      }
      parsed = schemaResult.data;
    }

    const { data, error } = await supabase
      .from("debt_documents")
      .insert({
        user_id: user.id,
        debt_id: id,
        file_name: parsed.file_name,
        file_path: parsed.file_path,
        mime_type: parsed.mime_type,
        size_bytes: parsed.size_bytes
      })
      .select("id")
      .single();

    if (error) return apiValidationError("No se pudo guardar el documento.");
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiServerError(error);
  }
}
