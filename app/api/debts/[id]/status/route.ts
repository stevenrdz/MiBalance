import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as { is_active?: boolean };
    if (typeof payload.is_active !== "boolean") {
      return apiValidationError("Estado de deuda inválido.");
    }

    const { supabase, user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const { error } = await supabase
      .from("debts")
      .update({ is_active: payload.is_active })
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) return apiValidationError("No se pudo actualizar el estado de la deuda.");

    revalidatePath("/debts");
    revalidatePath(`/debts/${id}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiServerError(error);
  }
}
