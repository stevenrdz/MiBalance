import { NextResponse } from "next/server";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { data: attachment, error: attachmentError } = await supabase
      .from("attachments")
      .select("id, file_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (attachmentError || !attachment) {
      return apiValidationError("Adjunto no encontrado.");
    }

    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([attachment.file_path]);
    if (storageError) return apiValidationError("No se pudo eliminar el archivo adjunto.");

    const { error } = await supabase
      .from("attachments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) return apiValidationError("No se pudo eliminar el adjunto.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}
