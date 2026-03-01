export type LoanInstallmentDraft = {
  installment_number: number;
  due_date: string;
  scheduled_amount: number;
  paid: boolean;
};

export type LoanDocumentAutofill = {
  isRelevant: boolean;
  reason?: string;
  creditor?: string;
  principal?: number;
  term_months?: number;
  installment_amount?: number;
  start_date?: string;
  installments: LoanInstallmentDraft[];
};

const BANK_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Banco Pichincha", pattern: /\bBANCO\s+PICHINCHA\b|\bBP\b/i },
  { name: "Banco Guayaquil", pattern: /\bBANCO\s+GUAYAQUIL\b|\bBG\b/i },
  { name: "Diners Club", pattern: /\bDINERS\b/i }
];

const KEYWORDS = [
  /\bPRESTAMO\b/i,
  /\bPR[EÉ]STAMO\b/i,
  /\bAMORTIZACION\b/i,
  /\bTABLA\s+DE\s+AMORTIZACION\b/i,
  /\bCUOTA\b/i,
  /\bDIVIDENDO\b/i,
  /\bLETRA\b/i,
  /\bCAPITAL\b/i,
  /\bINTERES\b/i
];

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

function extractInstallments(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const installments: LoanInstallmentDraft[] = [];

  lines.forEach((line) => {
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    const amounts = extractAmounts(line);
    const numberMatch = line.match(/\b(\d{1,3})\b/);
    if (!dateMatch || amounts.length === 0 || !numberMatch) return;

    const dueDate = toIsoDate(dateMatch[0]);
    const installmentNumber = Number(numberMatch[1]);
    const amount = amounts[amounts.length - 1];

    if (!dueDate || installmentNumber <= 0 || amount <= 0) return;
    if (installments.some((item) => item.installment_number === installmentNumber)) return;

    installments.push({
      installment_number: installmentNumber,
      due_date: dueDate,
      scheduled_amount: amount,
      paid: false
    });
  });

  return installments.sort((a, b) => a.installment_number - b.installment_number);
}

export function parseLoanDocument(text: string, fileName: string) {
  const source = `${fileName}\n${text}`;
  const isRelevant = KEYWORDS.some((pattern) => pattern.test(source));
  if (!isRelevant) {
    return {
      isRelevant: false,
      reason: "El archivo no parece ser un contrato, tabla de amortizacion o documento de prestamo.",
      installments: []
    } satisfies LoanDocumentAutofill;
  }

  const creditor = BANK_PATTERNS.find((item) => item.pattern.test(source))?.name;
  const installments = extractInstallments(text);
  const termMonthsFromText = source.match(/\b(\d{1,3})\s+(?:CUOTAS|DIVIDENDOS|MESES)\b/i);
  const term_months = installments.length || (termMonthsFromText ? Number(termMonthsFromText[1]) : undefined);
  const installmentAmountLabel =
    source.match(/\b(?:CUOTA|DIVIDENDO|LETRA)[^\d]{0,20}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))/i)?.[1] ??
    undefined;
  const installment_amount =
    (installmentAmountLabel ? normalizeAmount(installmentAmountLabel) : null) ??
    installments[0]?.scheduled_amount;
  const principalLabel =
    source.match(/\b(?:MONTO|CAPITAL|VALOR\s+FINANCIADO|TOTAL\s+PRESTAMO)[^\d]{0,20}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))/i)?.[1] ??
    undefined;
  const principal = principalLabel ? normalizeAmount(principalLabel) ?? undefined : undefined;
  const firstDate = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)?.[0];
  const start_date = firstDate ? toIsoDate(firstDate) ?? undefined : undefined;

  return {
    isRelevant: true,
    creditor,
    principal: principal ?? undefined,
    term_months,
    installment_amount: installment_amount ?? undefined,
    start_date,
    installments
  } satisfies LoanDocumentAutofill;
}
