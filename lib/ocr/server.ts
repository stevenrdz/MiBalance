import OpenAI from "openai";
import { access } from "node:fs/promises";
import path from "node:path";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TransactionType } from "@/lib/types";
import { parseReceiptText, type ReceiptAutofill } from "@/lib/ocr/receipt-parser";

export type OcrProvider = "openai" | "tesseract";

export type OcrResult = {
  autofill: ReceiptAutofill;
  provider: OcrProvider;
};

const aiReceiptSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  amount: z.number().positive().nullable().optional(),
  merchant: z.string().min(1).max(120).nullable().optional(),
  description: z.string().min(1).max(220).nullable().optional(),
  paymentMethod: z.enum(["cash", "transfer", "card"]).nullable().optional(),
  categoryNameHint: z.string().min(1).max(80).nullable().optional()
});

function sanitizeAutofill(autofill: z.infer<typeof aiReceiptSchema>): ReceiptAutofill {
  return {
    date: autofill.date ?? undefined,
    amount: autofill.amount ?? undefined,
    merchant: autofill.merchant ?? undefined,
    description: autofill.description ?? undefined,
    paymentMethod: autofill.paymentMethod ?? undefined,
    categoryNameHint: autofill.categoryNameHint ?? undefined
  };
}

function hasUsefulData(autofill: ReceiptAutofill) {
  return Boolean(
    autofill.date ||
      autofill.amount ||
      autofill.merchant ||
      autofill.paymentMethod ||
      autofill.categoryNameHint
  );
}

let cachedWorkerPath: string | null = null;

async function resolveTesseractWorkerPath() {
  if (cachedWorkerPath) return cachedWorkerPath;

  const candidates = [
    path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js"),
    path.join(
      process.cwd(),
      ".next",
      "server",
      "vendor-chunks",
      "tesseract.js",
      "src",
      "worker-script",
      "node",
      "index.js"
    )
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      cachedWorkerPath = candidate;
      return candidate;
    } catch {
      // continue searching
    }
  }

  return null;
}

async function analyzeWithOpenAI(
  file: File,
  transactionType: TransactionType
): Promise<ReceiptAutofill | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith("replace-") || !apiKey.startsWith("sk-")) return null;

  const model = process.env.OPENAI_OCR_MODEL || "gpt-4.1-mini";
  const bytes = Buffer.from(await file.arrayBuffer());
  const imageDataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  const client = new OpenAI({ apiKey, timeout: 10000, maxRetries: 1 });
  const parsed = await client.responses.parse({
    model,
    temperature: 0,
    input: [
      {
        role: "system",
        content:
          "Eres un extractor de datos de facturas para Ecuador. Responde solo con datos reales del comprobante."
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Extrae datos de esta foto de factura/recibo.",
              "Contexto:",
              "- Pais: Ecuador",
              "- Moneda: USD",
              `- Tipo de movimiento esperado: ${transactionType}`,
              "Reglas:",
              "- date debe estar en formato YYYY-MM-DD.",
              "- amount debe ser el total pagado final (no subtotal, no IVA parcial, no cambio).",
              "- paymentMethod debe ser cash|transfer|card cuando sea claro; si no, null.",
              "- categoryNameHint debe ser una sugerencia corta en espanol (ej. Alimentacion, Transporte, Salud, Servicios basicos, Vivienda, Educacion, Entretenimiento, Varios).",
              "- Si un dato no es confiable, usa null."
            ].join("\n")
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "high"
          }
        ]
      }
    ],
    text: {
      format: zodTextFormat(aiReceiptSchema, "receipt_autofill")
    }
  });

  return parsed.output_parsed ? sanitizeAutofill(parsed.output_parsed) : null;
}

export async function extractRawTextFromImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const workerPath = await resolveTesseractWorkerPath();
  if (!workerPath) {
    throw new Error("No se encontro el worker de Tesseract en el entorno local.");
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const worker = await createWorker("spa+eng", 1, { workerPath });

  try {
    const {
      data: { text }
    } = await worker.recognize(imageBuffer);
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}

async function analyzeWithTesseract(file: File): Promise<ReceiptAutofill> {
  const text = await extractRawTextFromImage(file);
  return parseReceiptText(text);
}

export async function analyzeReceiptFile(
  file: File,
  transactionType: TransactionType
): Promise<OcrResult> {
  try {
    const openAiResult = await analyzeWithOpenAI(file, transactionType);
    if (openAiResult && hasUsefulData(openAiResult)) {
      return {
        autofill: openAiResult,
        provider: "openai"
      };
    }
  } catch {
    // Silent fallback to local OCR parser if OpenAI is unavailable.
  }

  const tesseractResult = await analyzeWithTesseract(file);
  return {
    autofill: tesseractResult,
    provider: "tesseract"
  };
}
