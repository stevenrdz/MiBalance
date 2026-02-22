import { z } from "zod";

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
  payment_day: z.coerce.number().int().min(1).max(31)
});

export const cardPaymentSchema = z.object({
  date: z.string().min(1, "La fecha es obligatoria"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().max(500).optional().nullable()
});

export const debtSchema = z.object({
  type: z.enum(["LOAN", "CASH_ADVANCE"]),
  creditor: z.string().min(2, "Acreedor requerido").max(120),
  principal: z.coerce.number().positive("El principal debe ser mayor a 0"),
  start_date: z.string().min(1, "La fecha es obligatoria"),
  term_months: z.coerce.number().int().positive().nullable().optional(),
  interest_rate: z.coerce.number().min(0).nullable().optional(),
  notes: z.string().max(600).nullable().optional()
});

export const debtPaymentSchema = z.object({
  payment_date: z.string().min(1, "La fecha es obligatoria"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  notes: z.string().max(500).optional().nullable()
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
export type ProfileInput = z.infer<typeof profileSchema>;

