import type { PaymentMethod, TransactionType } from "@/lib/types";

type CategoryOption = {
  id: string;
  name: string;
  type: TransactionType;
};

export type ReceiptAutofill = {
  date?: string;
  amount?: number;
  merchant?: string;
  description?: string;
  paymentMethod?: PaymentMethod;
  categoryNameHint?: string;
};

const AMOUNT_KEYWORDS = [
  "TOTAL",
  "VALOR TOTAL",
  "TOTAL A PAGAR",
  "VALOR A PAGAR",
  "PAGO TOTAL",
  "IMPORTE",
  "MONTO",
  "TOTAL USD",
  "TOTAL USD$",
  "TOTAL:"
];

const AMOUNT_NOISE_KEYWORDS = ["SUBTOTAL", "IVA", "DESCUENTO", "PROPINA", "CAMBIO", "RUC", "CEDULA"];

const PAYMENT_CONTEXT_PATTERNS = [
  /\bFORMA(?:\s+DE)?\s+PAGO\b/,
  /\bMETODO(?:\s+DE)?\s+PAGO\b/,
  /\bMEDIO(?:\s+DE)?\s+PAGO\b/,
  /\bPAGO\b/
];

const PAYMENT_PATTERNS: Array<{ method: PaymentMethod; patterns: RegExp[] }> = [
  {
    method: "cash",
    patterns: [/\bEFECTIVO\b/, /\bCASH\b/, /\bCONTADO\b/]
  },
  {
    method: "transfer",
    patterns: [/\bTRANSFERENCIA\b/, /\bTRANSFER\b/, /\bDEPOSITO\b/, /\bDEP\b/, /\bSPEI\b/, /\bPSE\b/]
  },
  {
    method: "card",
    patterns: [
      /\bTARJETA\b/,
      /\bVISA\b/,
      /\bMASTERCARD\b/,
      /\bAMEX\b/,
      /\bDINERS\b/,
      /\bTAR\s*CRED\b/,
      /\bTAR\s*CREDITO\b/,
      /\bTAR\s*DEB\b/,
      /\bDEBITO\b/,
      /\bCREDITO\b/,
      /\bT\/?C\b/
    ]
  }
];

const PAYMENT_KEYWORDS: Array<{ method: PaymentMethod; words: string[] }> = [
  { method: "card", words: ["TARJETA", "VISA", "MASTERCARD", "DEBITO", "CREDITO", "TAR CRED"] },
  { method: "transfer", words: ["TRANSFERENCIA", "TRANSFER", "DEP", "SPEI", "DEPOSITO"] },
  { method: "cash", words: ["EFECTIVO", "CASH", "CONTADO"] }
];

const CATEGORY_HINTS: Array<{ category: string; words: string[] }> = [
  {
    category: "Alimentacion",
    words: [
      "SUPERMAXI",
      "TIA",
      "MEGAMAXI",
      "AKI",
      "RESTAURANTE",
      "COMIDA",
      "CAFE",
      "KFC",
      "MCDONALD",
      "POLLO",
      "MERCADO"
    ]
  },
  { category: "Transporte", words: ["UBER", "DIDI", "TAXI", "GASOLINA", "ESTACION", "COMBUSTIBLE", "PEAJE"] },
  { category: "Transporte", words: ["ATIMASA", "TERPEL", "PRIMAX", "PETROECUADOR", "PARKING", "PARQUEO"] },
  { category: "Servicios basicos", words: ["ELECTRICA", "AGUA", "INTERNET", "CLARO", "MOVISTAR", "CNT", "LUZ"] },
  {
    category: "Salud",
    words: ["FARMACIA", "MEDICINA", "HOSPITAL", "LABORATORIO", "SALUD", "SUPER ECONOMICA", "TUSSOLVINA"]
  },
  { category: "Educacion", words: ["COLEGIO", "UNIVERSIDAD", "MATRICULA", "CURSO", "EDUCACION"] },
  { category: "Entretenimiento", words: ["CINE", "NETFLIX", "SPOTIFY", "ENTRETENIMIENTO"] },
  { category: "Vivienda", words: ["ARRIENDO", "ALQUILER", "CONDOMINIO", "VIVIENDA"] },
  { category: "Varios", words: ["MODULSA", "PUNTO DE PAGO", "PEAJE", "OTROS"] }
];

function normalize(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function normalizeForSearch(raw: string) {
  return normalize(raw).replace(/[^A-Z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function extractNumericCandidates(source: string) {
  const matches = source.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})/g) ?? [];
  return matches
    .map((token) => {
      const normalized = token.includes(",") && token.includes(".")
        ? token.replace(/\./g, "").replace(",", ".")
        : token.replace(",", ".");
      return Number(normalized);
    })
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 100000);
}

function pickAmount(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const scoredCandidates: Array<{ value: number; score: number; lineIndex: number }> = [];

  lines.forEach((line, lineIndex) => {
    const normalized = normalize(line);
    const candidates = extractNumericCandidates(line);
    if (!candidates.length) return;

    let score = 0;
    if (AMOUNT_KEYWORDS.some((keyword) => normalized.includes(keyword))) score += 3;
    if (normalized.includes("$") || normalized.includes("USD")) score += 1;
    if (AMOUNT_NOISE_KEYWORDS.some((keyword) => normalized.includes(keyword))) score -= 2;

    for (const value of candidates) {
      if (value <= 0) continue;
      scoredCandidates.push({ value, score, lineIndex });
    }
  });

  const preferred = scoredCandidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.value - a.value || b.lineIndex - a.lineIndex);
  if (preferred.length) return preferred[0].value;

  // If no clearly labeled totals were found, inspect lines from bottom to top
  // because receipt totals are typically near the end.
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const normalized = normalize(line);
    const candidates = extractNumericCandidates(line).filter((value) => value <= 2000);
    if (!candidates.length) continue;
    const hasNoiseKeyword = AMOUNT_NOISE_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasTotalKeyword = normalized.includes("TOTAL");
    if (hasNoiseKeyword && !hasTotalKeyword) continue;
    return Math.max(...candidates);
  }

  const fallback = extractNumericCandidates(text);
  if (!fallback.length) return undefined;

  // Keep fallback conservative for receipts: prefer plausible transaction totals.
  const plausible = fallback.filter((value) => value <= 2000);
  if (plausible.length) return Math.max(...plausible);
  return Math.max(...fallback);
}

function toIsoDate(day: number, month: number, year: number) {
  const fullYear = year < 100 ? 2000 + year : year;
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${fullYear.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function pickDate(text: string) {
  const dateMatches = Array.from(text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g));
  for (const match of dateMatches) {
    const value = toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (!value) continue;
    const year = Number(value.slice(0, 4));
    if (year >= 2020 && year <= 2035) return value;
  }

  const dmy = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmy) {
    const value = toIsoDate(Number(dmy[1]), Number(dmy[2]), Number(dmy[3]));
    if (value) return value;
  }

  const ymd = text.match(/\b(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (ymd) {
    const value = toIsoDate(Number(ymd[3]), Number(ymd[2]), Number(ymd[1]));
    if (value) return value;
  }

  return undefined;
}

function pickMerchant(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 3);

  const ignoredWords = [
    "FACTURA",
    "RUC",
    "AUTORIZACION",
    "DIRECCION",
    "TELEFONO",
    "COMPROBANTE",
    "TOTAL",
    "IVA",
    "NO SE ACEPTARA",
    "CONSUMIDOR FINAL",
    "OBLIGADO",
    "CONTRIBUYENTE",
    "SUCURSAL",
    "MATRIZ",
    "DOCUMENTO"
  ];

  let best: { value: string; score: number } | undefined;

  lines.slice(0, 12).forEach((line, index) => {
    const normalized = normalize(line);
    const hasDigits = /\d{5,}/.test(normalized);
    const ignored = ignoredWords.some((word) => normalized.includes(word));
    const letterCount = normalized.replace(/[^A-Z]/g, "").length;
    const letterRatio = letterCount / normalized.length;
    const mostlyLetters = letterRatio >= 0.55;
    const startsWithAlpha = /^[A-Z]/.test(normalized);
    const words = normalized
      .split(/\s+/)
      .map((word) => word.replace(/[^A-Z]/g, ""))
      .filter(Boolean);
    const longWords = words.filter((word) => word.length >= 4);
    const hasCompanyHint =
      /(S\.A|SAS|CIA|FARMACIA|SUPER|ATIMA|MODULSA|PRIMAX|TERPEL|PETROECUADOR)/.test(normalized);
    const hasDisclaimerHint = /(DEVOLUCION|RECLAMACION|ACEPTARA)/.test(normalized);

    if (hasDigits || ignored || !mostlyLetters || !startsWithAlpha || normalized.length > 60) {
      return;
    }
    if (!longWords.length) return;

    let score = 0;
    if (index < 4) score += 2;
    else if (index < 8) score += 1;
    if (longWords.length >= 2) score += 1;
    if (hasCompanyHint) score += 2;
    if (hasDisclaimerHint) score -= 3;

    if (!best || score > best.score) {
      best = { value: line, score };
    }
  });

  return best?.value;
}

function pickPaymentMethod(text: string): PaymentMethod | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const scores: Record<PaymentMethod, number> = { cash: 0, transfer: 0, card: 0 };

  for (const line of lines) {
    const normalizedLine = normalizeForSearch(line);
    if (!normalizedLine) continue;

    const hasPaymentContext = PAYMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalizedLine));
    const amountCandidates = extractNumericCandidates(line).filter((value) => value <= 2000);
    const amountBonus = amountCandidates.length ? 1 : 0;

    for (const rule of PAYMENT_PATTERNS) {
      if (rule.patterns.some((pattern) => pattern.test(normalizedLine))) {
        scores[rule.method] += hasPaymentContext ? 3 : 1;
        scores[rule.method] += amountBonus;
      }
    }
  }

  const normalizedText = normalizeForSearch(text);
  if (PAYMENT_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalizedText))) {
    for (const rule of PAYMENT_PATTERNS) {
      if (rule.patterns.some((pattern) => pattern.test(normalizedText))) {
        scores[rule.method] += 1;
      }
    }
  }

  const ranking: Array<{ method: PaymentMethod; score: number }> = [
    { method: "card", score: scores.card },
    { method: "transfer", score: scores.transfer },
    { method: "cash", score: scores.cash }
  ];
  ranking.sort((a, b) => b.score - a.score);
  if (ranking[0].score > 0) {
    return ranking[0].method;
  }

  const normalized = normalize(text);
  for (const rule of PAYMENT_KEYWORDS) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return rule.method;
    }
  }
  return undefined;
}

function pickCategoryHint(text: string) {
  const normalized = normalize(text);
  for (const rule of CATEGORY_HINTS) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return rule.category;
    }
  }
  return undefined;
}

export function parseReceiptText(text: string): ReceiptAutofill {
  const date = pickDate(text);
  const amount = pickAmount(text);
  const merchant = pickMerchant(text);
  const paymentMethod = pickPaymentMethod(text);
  const categoryNameHint = pickCategoryHint(text);

  return {
    date,
    amount,
    merchant,
    paymentMethod,
    categoryNameHint,
    description: merchant ? `Factura: ${merchant}` : undefined
  };
}

export function matchCategoryByHint(
  categoryHint: string | undefined,
  categories: CategoryOption[],
  type: TransactionType
) {
  if (!categoryHint) return undefined;
  const normalizedHint = normalize(categoryHint);
  const sameTypeCategories = categories.filter((category) => category.type === type);
  const direct = sameTypeCategories.find((category) =>
    normalize(category.name).includes(normalizedHint)
  );
  if (direct) return direct.id;

  const fuzzy = sameTypeCategories.find((category) =>
    normalizedHint.split(" ").some((token) => token.length >= 4 && normalize(category.name).includes(token))
  );
  return fuzzy?.id;
}
