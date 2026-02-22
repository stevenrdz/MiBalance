export type TransactionType = "INCOME" | "EXPENSE";
export type PaymentMethod = "cash" | "transfer" | "card";
export type DebtType = "LOAN" | "CASH_ADVANCE";

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
  interest_rate: number | null;
  notes: string | null;
  is_active: boolean;
};

