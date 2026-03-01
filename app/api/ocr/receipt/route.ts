import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { analyzeReceiptFile } from "@/lib/ocr/server";
import { getAuthenticatedClient } from "@/lib/supabase/guard";
import type { TransactionType } from "@/lib/types";

export const runtime = "nodejs";

function parseTransactionType(value: FormDataEntryValue | null): TransactionType {
  return String(value ?? "EXPENSE").toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const { user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return apiValidationError("Debes enviar una imagen para analizar.");
    }

    if (!["image/jpeg", "image/png"].includes(fileEntry.type)) {
      return apiValidationError("Formato no soportado para OCR. Usa jpg o png.");
    }

    if (fileEntry.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return apiValidationError("La imagen excede el tamaño máximo de 5MB.");
    }

    const transactionType = parseTransactionType(formData.get("type"));
    const result = await analyzeReceiptFile(fileEntry, transactionType);
    console.info(
      `[ocr] provider=${result.provider} user=${user.id.slice(0, 8)} took=${Date.now() - startedAt}ms`
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[ocr] failed after ${Date.now() - startedAt}ms`, error);
    return apiServerError(error);
  }
}
