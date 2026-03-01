import { NextResponse } from "next/server";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { apiServerError, apiUnauthorized, apiValidationError } from "@/lib/api";
import { parseLoanDocument, type LoanDocumentAutofill } from "@/lib/ocr/loan-parser";
import { extractPdfText } from "@/lib/ocr/pdf-text";
import { extractRawTextFromImage, extractRawTextFromPdfFirstPage } from "@/lib/ocr/server";
import { getAuthenticatedClient } from "@/lib/supabase/guard";

export const runtime = "nodejs";

type FieldSource = {
  file_name: string;
  document_category?: string;
};

type AnalyzedDocument = LoanDocumentAutofill & {
  file_name: string;
};

function priorityForCategory(category?: string) {
  if (category === "AMORTIZATION_TABLE") return 3;
  if (category === "CONTRACT") return 2;
  if (category === "STATEMENT") return 1;
  return 0;
}

function chooseDocument<T>(
  documents: AnalyzedDocument[],
  selector: (doc: AnalyzedDocument) => T | null | undefined,
  preferred?: Array<AnalyzedDocument["document_category"]>
) {
  const filtered = documents.filter((doc) => selector(doc) != null);
  if (filtered.length === 0) return null;

  if (preferred?.length) {
    for (const category of preferred) {
      const match = filtered.find((doc) => doc.document_category === category);
      if (match) return match;
    }
  }

  return [...filtered].sort(
    (left, right) =>
      priorityForCategory(right.document_category) - priorityForCategory(left.document_category)
  )[0];
}

function mergeDocuments(documents: AnalyzedDocument[]) {
  const relevant = documents.filter((document) => document.isRelevant);
  if (relevant.length === 0) {
    const first = documents[0];
    return {
      ...(first ?? {
        isRelevant: false,
        reason: "No se encontraron documentos válidos para analizar.",
        installments: []
      }),
      documents
    };
  }

  const bestInstallmentDocument =
    [...relevant].sort((left, right) => {
      const leftScore = left.installments.length * 10 + priorityForCategory(left.document_category);
      const rightScore = right.installments.length * 10 + priorityForCategory(right.document_category);
      return rightScore - leftScore;
    })[0] ?? null;
  const creditorDoc = chooseDocument(relevant, (doc) => doc.creditor, ["CONTRACT", "AMORTIZATION_TABLE"]);
  const principalDoc = chooseDocument(relevant, (doc) => doc.principal, ["CONTRACT", "AMORTIZATION_TABLE"]);
  const termDoc = chooseDocument(relevant, (doc) => doc.term_months, ["AMORTIZATION_TABLE", "CONTRACT"]);
  const installmentDoc =
    chooseDocument(relevant, (doc) => doc.installment_amount, ["AMORTIZATION_TABLE", "CONTRACT"]) ??
    bestInstallmentDocument;
  const interestDoc = chooseDocument(relevant, (doc) => doc.interest_rate, [
    "AMORTIZATION_TABLE",
    "CONTRACT"
  ]);
  const startDateDoc = chooseDocument(relevant, (doc) => doc.start_date, [
    "AMORTIZATION_TABLE",
    "CONTRACT"
  ]);

  const field_sources: Record<string, FieldSource | null> = {
    creditor: creditorDoc
      ? { file_name: creditorDoc.file_name, document_category: creditorDoc.document_category }
      : null,
    principal: principalDoc
      ? { file_name: principalDoc.file_name, document_category: principalDoc.document_category }
      : null,
    term_months: termDoc
      ? { file_name: termDoc.file_name, document_category: termDoc.document_category }
      : null,
    installment_amount: installmentDoc
      ? { file_name: installmentDoc.file_name, document_category: installmentDoc.document_category }
      : null,
    interest_rate: interestDoc
      ? { file_name: interestDoc.file_name, document_category: interestDoc.document_category }
      : null,
    start_date: startDateDoc
      ? { file_name: startDateDoc.file_name, document_category: startDateDoc.document_category }
      : null,
    installments: bestInstallmentDocument
      ? {
          file_name: bestInstallmentDocument.file_name,
          document_category: bestInstallmentDocument.document_category
        }
      : null
  };

  return {
    isRelevant: true,
    detectedType: chooseDocument(relevant, (doc) => doc.detectedType)?.detectedType,
    creditor: creditorDoc?.creditor,
    principal: principalDoc?.principal,
    term_months: termDoc?.term_months ?? bestInstallmentDocument?.installments.length,
    installment_amount: installmentDoc?.installment_amount,
    interest_rate: interestDoc?.interest_rate,
    start_date: startDateDoc?.start_date,
    installments: bestInstallmentDocument?.installments ?? [],
    documents,
    field_sources,
    installments_source_file_name: bestInstallmentDocument?.file_name ?? null
  };
}

async function extractText(fileEntry: File) {
  if (fileEntry.type === "application/pdf") {
    const bytes = Buffer.from(await fileEntry.arrayBuffer());
    return extractPdfText(bytes);
  }
  return extractRawTextFromImage(fileEntry);
}

async function analyzeFile(fileEntry: File, expectedType?: "LOAN" | "CASH_ADVANCE" | "DEFERRED") {
  const text = await extractText(fileEntry);
  let result = parseLoanDocument(text, fileEntry.name, expectedType);

  // If embedded PDF text is incomplete, rasterize the first page and run OCR as a fallback.
  if (fileEntry.type === "application/pdf" && (!result.isRelevant || !result.creditor)) {
    try {
      const ocrText = await extractRawTextFromPdfFirstPage(fileEntry);
      if (ocrText.trim()) {
        result = parseLoanDocument(`${text}\n${ocrText}`, fileEntry.name, expectedType);
      }
    } catch {
      // Keep the text-only result if PDF rasterization is not available for this file.
    }
  }

  return {
    ...result,
    file_name: fileEntry.name
  } satisfies AnalyzedDocument;
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedClient();
    if (!user) return apiUnauthorized();

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    const singleFile = formData.get("file");
    if (singleFile instanceof File && files.length === 0) {
      files.push(singleFile);
    }

    const expectedTypeEntry = formData.get("expectedType");
    const expectedType =
      typeof expectedTypeEntry === "string" &&
      ["LOAN", "CASH_ADVANCE", "DEFERRED"].includes(expectedTypeEntry)
        ? (expectedTypeEntry as "LOAN" | "CASH_ADVANCE" | "DEFERRED")
        : undefined;

    if (files.length === 0) {
      return apiValidationError("Debes enviar al menos un documento para analizar.");
    }

    for (const fileEntry of files) {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(fileEntry.type)) {
        return apiValidationError("Formato no soportado. Usa PDF, JPG o PNG.");
      }
      if (fileEntry.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return apiValidationError("El documento excede el tamaño máximo de 5MB.");
      }
    }

    const documents: AnalyzedDocument[] = [];
    for (const fileEntry of files) {
      documents.push(await analyzeFile(fileEntry, expectedType));
    }

    return NextResponse.json(mergeDocuments(documents));
  } catch (error) {
    return apiServerError(error);
  }
}
