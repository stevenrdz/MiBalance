type DebtDocumentType = "LOAN" | "CASH_ADVANCE" | "DEFERRED";

export type LoanInstallmentDraft = {
  installment_number: number;
  due_date: string;
  scheduled_amount: number;
  paid: boolean;
};

export type LoanDocumentAutofill = {
  isRelevant: boolean;
  reason?: string;
  detectedType?: DebtDocumentType;
  creditor?: string;
  principal?: number;
  term_months?: number;
  installment_amount?: number;
  start_date?: string;
  installments: LoanInstallmentDraft[];
};

const BANK_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Banco Pichincha", pattern: /\bBANCO\s+PICHINCHA\b|\bPICHINCHA\b|\bBP\b/i },
  { name: "Banco Guayaquil", pattern: /\bBANCO\s+GUAYAQUIL\b|\bGUAYAQUIL\b|\bBG\b/i },
  { name: "Diners Club", pattern: /\bDINERS\b/i }
];

const TYPE_PATTERNS: Array<{ type: DebtDocumentType; pattern: RegExp }> = [
  { type: "CASH_ADVANCE", pattern: /\bAVANCE\s+EN\s+EFECTIVO\b|\bAVANCE\b/i },
  { type: "DEFERRED", pattern: /\bDIFERID[OA]S?\b|\bCORRIENTE\s+DIFERIDO\b/i },
  { type: "LOAN", pattern: /\bPRESTAMO\b|\bPR[ÉE]STAMO\b|\bAMORTIZACION\b|\bTABLA\s+DE\s+AMORTIZACION\b/i }
];

const GENERIC_KEYWORDS = [
  /\bPRESTAMO\b/i,
  /\bPR[ÉE]STAMO\b/i,
  /\bAMORTIZACION\b/i,
  /\bTABLA\s+DE\s+AMORTIZACION\b/i,
  /\bTABLAAMORTIZACION\b/i,
  /\bCUOTA\b/i,
  /\bDIVIDENDO\b/i,
  /\bLETRA\b/i,
  /\bCAPITAL\b/i,
  /\bINTERES\b/i,
  /\bAVANCE\s+EN\s+EFECTIVO\b/i,
  /\bDIFERID[OA]S?\b/i
];

const MONTHS: Record<string, string> = {
  ENERO: "01",
  FEBRERO: "02",
  MARZO: "03",
  ABRIL: "04",
  MAYO: "05",
  JUNIO: "06",
  JULIO: "07",
  AGOSTO: "08",
  SEPTIEMBRE: "09",
  SETIEMBRE: "09",
  OCTUBRE: "10",
  NOVIEMBRE: "11",
  DICIEMBRE: "12"
};

function normalizeForSearch(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compactSpacedText(raw: string) {
  return raw.replace(/(?:\b[A-Z0-9]\b\s*){3,}/g, (match) => match.replace(/\s+/g, ""));
}

function normalizeAmount(raw: string) {
  const cleaned = raw.includes(",") && raw.includes(".")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractAmounts(line: string) {
  return (line.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})/g) ?? [])
    .map((token) => normalizeAmount(token))
    .filter((value): value is number => value != null);
}

function toIsoDate(raw: string) {
  const match = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

function toIsoLongDate(raw: string) {
  const normalized = normalizeForSearch(raw);
  const match = normalized.match(/(\d{1,2})\s+DE\s+([A-Z]+)\s+DE\s+(\d{4})/);
  if (!match) return null;

  const month = MONTHS[match[2]];
  if (!month) return null;

  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

function isRowStart(tokens: string[], index: number) {
  return Boolean(tokens[index]?.match(/^\d{1,3}$/) && toIsoDate(tokens[index + 1] ?? ""));
}

function chooseScheduledAmount(amounts: number[]) {
  if (amounts.length >= 5) return amounts[amounts.length - 2];
  return amounts[amounts.length - 1];
}

function mergeInstallments(rows: LoanInstallmentDraft[]) {
  const map = new Map<number, LoanInstallmentDraft>();
  rows.forEach((row) => {
    if (row.installment_number <= 0 || row.scheduled_amount <= 0) return;
    if (!map.has(row.installment_number)) map.set(row.installment_number, row);
  });
  return Array.from(map.values()).sort((a, b) => a.installment_number - b.installment_number);
}

function extractInstallmentsFromInlineLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => compactSpacedText(normalizeForSearch(line)))
    .filter(Boolean);

  const installments: LoanInstallmentDraft[] = [];

  lines.forEach((line) => {
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    const amounts = extractAmounts(line);
    const numberMatch = line.match(/\b(?:CUOTA|DIVIDENDO|LETRA|SEC)?\s*(\d{1,3})\b/);

    if (!dateMatch || amounts.length < 2 || !numberMatch) return;

    const dueDate = toIsoDate(dateMatch[0]);
    const installmentNumber = Number(numberMatch[1]);
    const amount = chooseScheduledAmount(amounts);

    if (!dueDate || installmentNumber <= 0 || amount <= 0) return;

    installments.push({
      installment_number: installmentNumber,
      due_date: dueDate,
      scheduled_amount: amount,
      paid: false
    });
  });

  return installments;
}

function extractInstallmentsFromTokenTable(text: string) {
  const tokens = text
    .split(/\r?\n/)
    .map((line) => compactSpacedText(line).trim())
    .filter(Boolean);

  const installments: LoanInstallmentDraft[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (!isRowStart(tokens, index)) continue;

    const installmentNumber = Number(tokens[index]);
    const dueDate = toIsoDate(tokens[index + 1]);
    if (!dueDate) continue;

    const numericTokens: number[] = [];
    let cursor = index + 2;
    while (cursor < tokens.length && !isRowStart(tokens, cursor)) {
      const amount = normalizeAmount(tokens[cursor]);
      if (amount != null) numericTokens.push(amount);
      cursor += 1;
    }

    if (numericTokens.length < 3) continue;

    installments.push({
      installment_number: installmentNumber,
      due_date: dueDate,
      scheduled_amount: chooseScheduledAmount(numericTokens),
      paid: false
    });

    index = cursor - 1;
  }

  return installments;
}

function extractInstallments(text: string) {
  return mergeInstallments([
    ...extractInstallmentsFromInlineLines(text),
    ...extractInstallmentsFromTokenTable(text)
  ]);
}

function extractDetectedType(source: string) {
  return TYPE_PATTERNS.find((entry) => entry.pattern.test(source))?.type ?? "LOAN";
}

function extractPrincipal(source: string, normalizedSource: string) {
  const principalLabel =
    source.match(
      /\b(?:MONTO|CAPITAL|VALOR\s+FINANCIADO|TOTAL\s+PRESTAMO|CAPITAL:)\b[^\d]{0,30}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))/i
    )?.[1] ??
    normalizedSource.match(
      /\b(?:MONTO|CAPITAL|VALOR FINANCIADO|TOTAL PRESTAMO)\b[^\d]{0,30}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))/i
    )?.[1] ??
    undefined;

  return principalLabel ? normalizeAmount(principalLabel) ?? undefined : undefined;
}

function extractTermMonths(source: string, normalizedSource: string, installments: LoanInstallmentDraft[]) {
  if (installments.length > 1) return installments.length;

  const termMonthsFromText =
    source.match(/\b(\d{1,3})\s+(?:CUOTAS|DIVIDENDOS|MESES)\b/i) ??
    normalizedSource.match(/\b(\d{1,3})\s+(?:CUOTAS|DIVIDENDOS|MESES)\b/i) ??
    source.match(/\bNUMERO\s+DE\s+CUOTAS[^\d]{0,20}(\d{1,3})\b/i) ??
    normalizedSource.match(/\bNUMERO DE CUOTAS[^\d]{0,20}(\d{1,3})\b/i);

  return termMonthsFromText ? Number(termMonthsFromText[1]) : undefined;
}

function extractInstallmentAmount(source: string, installments: LoanInstallmentDraft[]) {
  const installmentAmountLabel =
    source.match(
      /\b(?:CUOTA\s+NORMAL|PRIMERA\s+CUOTA|CUOTA|DIVIDENDO|LETRA|DIV\.?\s+TOTAL)\b[^\d]{0,20}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))/i
    )?.[1] ?? undefined;

  return (installmentAmountLabel ? normalizeAmount(installmentAmountLabel) : null) ?? installments[0]?.scheduled_amount;
}

function extractStartDate(source: string, installments: LoanInstallmentDraft[]) {
  if (installments.length > 0) return installments[0].due_date;

  const labeledLongDate =
    source.match(/\b(?:PRIMERA\s+CUOTA|FECHA\s+DE\s+PAGO|FECHA\s+INICIO)[^\n]{0,50}?(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)?.[1] ??
    source.match(/(\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4})/i)?.[1];
  if (labeledLongDate) {
    const parsed = toIsoLongDate(labeledLongDate);
    if (parsed) return parsed;
  }

  const slashDate = source.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)?.[0];
  return slashDate ? toIsoDate(slashDate) ?? undefined : undefined;
}

export function parseLoanDocument(text: string, fileName: string, expectedType?: DebtDocumentType) {
  const source = `${fileName}\n${text}`;
  const normalizedSource = compactSpacedText(normalizeForSearch(source));
  const installments = extractInstallments(text);

  const isRelevant =
    installments.length > 1 ||
    GENERIC_KEYWORDS.some((pattern) => pattern.test(source) || pattern.test(normalizedSource)) ||
    /\bTABLAAMORTIZACION\b/.test(normalizedSource) ||
    /\bPICHINCHA\b/.test(normalizedSource) ||
    /\bGUAYAQUIL\b/.test(normalizedSource);

  if (!isRelevant) {
    return {
      isRelevant: false,
      reason: "El archivo no parece ser un contrato, tabla de amortizacion o documento de prestamo.",
      installments: []
    } satisfies LoanDocumentAutofill;
  }

  const detectedType = extractDetectedType(normalizedSource);
  if (expectedType && expectedType !== detectedType && installments.length === 0) {
    return {
      isRelevant: false,
      detectedType,
      reason: "El documento no parece corresponder al tipo de deuda seleccionado.",
      installments: []
    } satisfies LoanDocumentAutofill;
  }

  const creditor = BANK_PATTERNS.find(
    (item) => item.pattern.test(source) || item.pattern.test(normalizedSource)
  )?.name;
  const principal = extractPrincipal(source, normalizedSource);
  const term_months = extractTermMonths(source, normalizedSource, installments);
  const installment_amount = extractInstallmentAmount(source, installments);
  const start_date = extractStartDate(source, installments);

  return {
    isRelevant: true,
    detectedType,
    creditor,
    principal: principal ?? undefined,
    term_months,
    installment_amount: installment_amount ?? undefined,
    start_date,
    installments
  } satisfies LoanDocumentAutofill;
}
