import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { parseLoanDocument } from "@/lib/ocr/loan-parser";
import { extractPdfText } from "@/lib/ocr/pdf-text";
import { extractRawTextFromImage } from "@/lib/ocr/server";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    const expectedTypeEntry = formData.get("expectedType");
    if (!(fileEntry instanceof File)) {
      return apiValidationError("Debes enviar un documento para analizar.");
    }

    if (!["application/pdf", "image/jpeg", "image/png"].includes(fileEntry.type)) {
      return apiValidationError("Formato no soportado. Usa PDF, JPG o PNG.");
    }

    if (fileEntry.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return apiValidationError("El documento excede el tamano maximo de 5MB.");
    }

    let text = "";
    if (fileEntry.type === "application/pdf") {
      const bytes = Buffer.from(await fileEntry.arrayBuffer());
      text = extractPdfText(bytes);
    } else {
      text = await extractRawTextFromImage(fileEntry);
    }

    const expectedType =
      typeof expectedTypeEntry === "string" &&
      ["LOAN", "CASH_ADVANCE", "DEFERRED"].includes(expectedTypeEntry)
        ? (expectedTypeEntry as "LOAN" | "CASH_ADVANCE" | "DEFERRED")
        : undefined;

    const result = parseLoanDocument(text, fileEntry.name, expectedType);
    return NextResponse.json(result);
  } catch (error) {
    return apiServerError(error);
  }
}
