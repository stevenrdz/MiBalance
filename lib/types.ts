export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentMethod = "cash" | "transfer" | "card";
export type DebtType = "LOAN" | "CASH_ADVANCE" | "DEFERRED";

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  is_active: boolean;
};

export type CardItem = {
  id: string;
  name: string;
  credit_limit: number;
  statement_day: number;
  payment_day: number;
  minimum_payment_amount: number | null;
  payment_due_date: string | null;
  currency: "USD";
  is_active: boolean;
};

export type DebtItem = {
  id: string;
  type: DebtType;
  creditor: string;
  principal: number;
  start_date: string;
  term_months: number | null;
  installment_amount: number | null;
  payment_day: number | null;
  current_installment: number;
  interest_rate: number | null;
  notes: string | null;
  is_active: boolean;
};

export type DebtInstallmentStatus = "PENDING" | "PARTIAL" | "PAID";
