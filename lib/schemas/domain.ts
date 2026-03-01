import { z } from "zod";

const optionalNullableNumber = () =>
  z.preprocess((value) => {
    if (value === "" || value == null) return null;
    return value;
  }, z.coerce.number().positive().nullable().optional());

const optionalNullablePositiveInt = () =>
  z.preprocess((value) => {
    if (value === "" || value == null) return null;
    return value;
  }, z.coerce.number().int().positive().nullable().optional());

const optionalNullableNonNegativeNumber = () =>
  z.preprocess((value) => {
    if (value === "" || value == null) return null;
    return value;
  }, z.coerce.number().min(0).nullable().optional());

const optionalNullableDay = () =>
  z.preprocess((value) => {
    if (value === "" || value == null) return null;
    return value;
  }, z.coerce.number().int().min(1).max(31).nullable().optional());

const optionalNullableDate = () =>
  z.preprocess((value) => {
    if (value === "" || value == null) return null;
    return value;
  }, z.string().min(1).nullable().optional());

export const transactionSchema = z
  .object({
    date: z.string().min(1, "La fecha es obligatoria"),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
    category_id: z.string().uuid("Categoría inválida"),
    payment_method: z.enum(["cash", "transfer", "card"]),
    card_id: z.string().uuid().nullable().optional(),
    merchant: z.string().max(150).optional().nullable(),
    description: z.string().max(500).optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === "card" && !data.card_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["card_id"],
        message: "Selecciona una tarjeta cuando el método sea tarjeta."
      });
    }
  });

export const categorySchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto").max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
  is_active: z.boolean().default(true)
});

export const cardSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto").max(80),
  credit_limit: z.coerce.number().positive("El cupo debe ser mayor a 0"),
  statement_day: z.coerce.number().int().min(1).max(31),
  payment_day: z.coerce.number().int().min(1).max(31),
  minimum_payment_amount: optionalNullableNumber(),
  payment_due_date: optionalNullableDate()
});

export const cardPaymentSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().max(500).optional().nullable()
});

export const debtSchema = z.object({
  type: z.enum(["LOAN", "CASH_ADVANCE", "DEFERRED"]),
  creditor: z.string().min(2, "Acreedor requerido").max(120),
  principal: z.coerce.number().positive("El principal debe ser mayor a 0"),
  start_date: z.string().min(1, "La fecha es obligatoria"),
  term_months: optionalNullablePositiveInt(),
  installment_amount: optionalNullableNumber(),
  payment_day: optionalNullableDay(),
  current_installment: z.coerce.number().int().positive("El mes actual debe ser mayor a 0"),
  interest_rate: optionalNullableNonNegativeNumber(),
  notes: z.string().max(600).nullable().optional()
}).superRefine((data, ctx) => {
  if (data.term_months && data.current_installment > data.term_months) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["current_installment"],
      message: "El mes actual no puede ser mayor al plazo."
    });
  }
});

export const debtPaymentSchema = z.object({
  payment_date: z.string().min(1, "La fecha es obligatoria"),
  installment_number: z.coerce.number().int().positive("Selecciona una cuota"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  payment_method: z.enum(["cash", "transfer", "card"]),
  notes: z.string().max(500).optional().nullable(),
  receipt_file_name: z.string().max(255).optional().nullable(),
  receipt_file_path: z.string().max(500).optional().nullable(),
  receipt_mime_type: z.string().max(120).optional().nullable(),
  receipt_size_bytes: z.coerce.number().int().positive().max(5242880).optional().nullable()
});

export const debtDocumentSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(120),
  size_bytes: z.coerce.number().int().positive().max(5242880)
});

export const debtInstallmentSchema = z.object({
  installment_number: z.coerce.number().int().positive("Numero de letra invalido"),
  due_date: z.string().min(1, "La fecha es obligatoria"),
  scheduled_amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  document_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
});

export const generateDebtInstallmentsSchema = z.object({
  document_id: z.string().uuid().optional().nullable()
});

export const settleDebtInstallmentSchema = z.object({
  status: z.enum(["PENDING", "PARTIAL", "PAID"]),
  paid_amount: z.coerce.number().min(0).default(0),
  paid_at: optionalNullableDate(),
  payment_method: z.enum(["cash", "transfer", "card"]).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  receipt_file_name: z.string().max(255).optional().nullable(),
  receipt_file_path: z.string().max(500).optional().nullable(),
  receipt_mime_type: z.string().max(120).optional().nullable(),
  receipt_size_bytes: z.coerce.number().int().positive().max(5242880).optional().nullable()
}).superRefine((data, ctx) => {
  if ((data.status === "PAID" || data.status === "PARTIAL") && data.paid_amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["paid_amount"],
      message: "Ingresa el monto pagado."
    });
  }
});

export const profileSchema = z.object({
  display_name: z.string().min(2, "Nombre muy corto").max(100),
  monthly_income_goal: z.coerce.number().min(0, "No puede ser negativo").optional()
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CardInput = z.infer<typeof cardSchema>;
export type CardPaymentInput = z.infer<typeof cardPaymentSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;
export type DebtDocumentInput = z.infer<typeof debtDocumentSchema>;
export type DebtInstallmentInput = z.infer<typeof debtInstallmentSchema>;
export type GenerateDebtInstallmentsInput = z.infer<typeof generateDebtInstallmentsSchema>;
export type SettleDebtInstallmentInput = z.infer<typeof settleDebtInstallmentSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
