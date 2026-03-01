import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { parseLoanDocument } from "@/lib/ocr/loan-parser";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export const runtime = "nodejs";

function extractPdfText(bytes: Buffer) {
  const matches = bytes.toString("latin1").match(/[\x20-\x7E]{6,}/g) ?? [];
  return matches.join("\n");
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return apiValidationError("Debes enviar un documento para analizar.");
    }

    if (!["application/pdf", "image/jpeg", "image/png"].includes(fileEntry.type)) {
      return apiValidationError("Formato no soportado. Usa PDF, JPG o PNG.");
    }

    if (fileEntry.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return apiValidationError("El documento excede el tamaño maximo de 5MB.");
    }

    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    const text = extractPdfText(bytes);
    const result = parseLoanDocument(text, fileEntry.name);
    return NextResponse.json(result);
  } catch (error) {
    return apiServerError(error);
  }
}
