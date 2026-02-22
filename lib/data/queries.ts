import { redirect } from "next/navigation";
import { currentMonthRange, getCardCycle, sanitizeRange } from "@/lib/date";
import { PAGINATION_SIZE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type DashboardFilters = {
  from?: string;
  to?: string;
  type?: string;
  categoryId?: string;
  paymentMethod?: string;
};

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  return { supabase, user };
}

export async function getCategories(includeInactive = false) {
  const { supabase, user } = await getCurrentUser();
  let query = supabase
    .from("categories")
    .select("id, name, type, is_active")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCards(includeInactive = false) {
  const { supabase, user } = await getCurrentUser();
  let query = supabase
    .from("cards")
    .select("id, name, credit_limit, statement_day, payment_day, currency, is_active")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getTransactions(params: {
  page?: number;
  q?: string;
  from?: string;
  to?: string;
  type?: string;
  categoryId?: string;
  paymentMethod?: string;
}) {
  const { supabase, user } = await getCurrentUser();
  const page = Math.max(1, Number(params.page ?? 1));
  const fromIdx = (page - 1) * PAGINATION_SIZE;
  const toIdx = fromIdx + PAGINATION_SIZE - 1;
  const dateRange = sanitizeRange(params.from, params.to);

  let query = supabase
    .from("transactions")
    .select(
      "id, date, amount, type, payment_method, merchant, description, card_id, created_at, category:categories(id, name), card:cards(id, name), attachments(id, file_name, file_path)",
      { count: "exact" }
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("date", dateRange.from)
    .lte("date", dateRange.to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.type) query = query.eq("type", params.type);
  if (params.categoryId) query = query.eq("category_id", params.categoryId);
  if (params.paymentMethod) query = query.eq("payment_method", params.paymentMethod);
  if (params.q) {
    query = query.or(
      `merchant.ilike.%${params.q.replace(/,/g, " ")}%,description.ilike.%${params.q.replace(/,/g, " ")}%`
    );
  }

  const { data, error, count } = await query.range(fromIdx, toIdx);
  if (error) throw new Error(error.message);

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGINATION_SIZE,
    range: dateRange
  };
}

export async function getTransactionById(id: string) {
  const { supabase, user } = await getCurrentUser();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, date, amount, type, payment_method, category_id, card_id, merchant, description, attachments(id, file_name, file_path)"
    )
    .eq("user_id", user.id)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getDashboardData(filters: DashboardFilters) {
  const { supabase, user } = await getCurrentUser();
  const { from, to } = sanitizeRange(filters.from, filters.to);

  let txQuery = supabase
    .from("transactions")
    .select("id, amount, type, payment_method, date, category:categories(id, name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .gte("date", from)
    .lte("date", to);

  if (filters.type) txQuery = txQuery.eq("type", filters.type);
  if (filters.categoryId) txQuery = txQuery.eq("category_id", filters.categoryId);
  if (filters.paymentMethod) txQuery = txQuery.eq("payment_method", filters.paymentMethod);

  const { data: transactions, error: txError } = await txQuery;
  if (txError) throw new Error(txError.message);

  const txList = transactions ?? [];
  const totalIncome = txList
    .filter((item) => item.type === "INCOME")
    .reduce((acc, item) => acc + Number(item.amount), 0);
  const totalExpense = txList
    .filter((item) => item.type === "EXPENSE")
    .reduce((acc, item) => acc + Number(item.amount), 0);
  const balance = totalIncome - totalExpense;

  const { data: cardExpenses, error: cardExpError } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("payment_method", "card")
    .eq("type", "EXPENSE")
    .is("deleted_at", null)
    .gte("date", from)
    .lte("date", to);
  if (cardExpError) throw new Error(cardExpError.message);

  const { data: cardPayments, error: cardPayError } = await supabase
    .from("card_payments")
    .select("amount")
    .eq("user_id", user.id)
    .gte("date", from)
    .lte("date", to);
  if (cardPayError) throw new Error(cardPayError.message);

  const totalCardExpenses = (cardExpenses ?? []).reduce((acc, item) => acc + Number(item.amount), 0);
  const totalCardPayments = (cardPayments ?? []).reduce((acc, item) => acc + Number(item.amount), 0);
  const totalCardToPay = Math.max(totalCardExpenses - totalCardPayments, 0);

  const { data: debts, error: debtError } = await supabase
    .from("debts")
    .select("id, principal")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .eq("is_active", true);
  if (debtError) throw new Error(debtError.message);

  const debtIds = (debts ?? []).map((debt) => debt.id);
  const { data: debtPayments, error: debtPaymentsError } = await supabase
    .from("debt_payments")
    .select("debt_id, amount")
    .eq("user_id", user.id)
    .in("debt_id", debtIds.length ? debtIds : ["00000000-0000-0000-0000-000000000000"]);
  if (debtPaymentsError) throw new Error(debtPaymentsError.message);

  const debtPaymentMap = new Map<string, number>();
  (debtPayments ?? []).forEach((payment) => {
    const prev = debtPaymentMap.get(payment.debt_id) ?? 0;
    debtPaymentMap.set(payment.debt_id, prev + Number(payment.amount));
  });
  const totalDebt = (debts ?? []).reduce((acc, debt) => {
    const paid = debtPaymentMap.get(debt.id) ?? 0;
    return acc + Math.max(Number(debt.principal) - paid, 0);
  }, 0);

  const expensesByCategoryMap = new Map<string, number>();
  txList
    .filter((item) => item.type === "EXPENSE")
    .forEach((item) => {
      const category = Array.isArray(item.category) ? item.category[0] : item.category;
      const name = category?.name ?? "Sin categoría";
      const previous = expensesByCategoryMap.get(name) ?? 0;
      expensesByCategoryMap.set(name, previous + Number(item.amount));
    });

  const expensesByCategory = Array.from(expensesByCategoryMap.entries()).map(
    ([category, amount]) => ({
      category,
      amount
    })
  );

  const trendMap = new Map<string, { month: string; income: number; expense: number }>();
  txList.forEach((item) => {
    const month = item.date.slice(0, 7);
    const current = trendMap.get(month) ?? { month, income: 0, expense: 0 };
    if (item.type === "INCOME") current.income += Number(item.amount);
    if (item.type === "EXPENSE") current.expense += Number(item.amount);
    trendMap.set(month, current);
  });

  const trend = Array.from(trendMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    filters: { from, to, ...filters },
    totals: {
      totalIncome,
      totalExpense,
      balance,
      totalCardToPay,
      totalDebt
    },
    expensesByCategory,
    trend
  };
}

export async function getCardsWithStats() {
  const { supabase, user } = await getCurrentUser();
  const { data: cards, error } = await supabase
    .from("cards")
    .select("id, name, credit_limit, statement_day, payment_day, currency, is_active")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return cards ?? [];
}

export async function getCardDetail(cardId: string) {
  const { supabase, user } = await getCurrentUser();

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, name, credit_limit, statement_day, payment_day, currency, is_active")
    .eq("user_id", user.id)
    .eq("id", cardId)
    .is("deleted_at", null)
    .single();

  if (cardError) throw new Error(cardError.message);

  const cycle = getCardCycle(Number(card.statement_day));
  const { data: consumptions, error: consumptionError } = await supabase
    .from("transactions")
    .select("id, date, amount, merchant, description")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .eq("payment_method", "card")
    .eq("type", "EXPENSE")
    .is("deleted_at", null)
    .gte("date", cycle.start)
    .lte("date", cycle.end)
    .order("date", { ascending: false });
  if (consumptionError) throw new Error(consumptionError.message);

  const { data: payments, error: paymentError } = await supabase
    .from("card_payments")
    .select("id, date, amount, notes")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .gte("date", cycle.start)
    .lte("date", cycle.end)
    .order("date", { ascending: false });
  if (paymentError) throw new Error(paymentError.message);

  const totalConsumptions = (consumptions ?? []).reduce((acc, item) => acc + Number(item.amount), 0);
  const totalPayments = (payments ?? []).reduce((acc, item) => acc + Number(item.amount), 0);
  const totalPending = Math.max(totalConsumptions - totalPayments, 0);

  return {
    card,
    cycle,
    consumptions: consumptions ?? [],
    payments: payments ?? [],
    summary: { totalConsumptions, totalPayments, totalPending }
  };
}

export async function getDebtsWithStats() {
  const { supabase, user } = await getCurrentUser();
  const { data: debts, error } = await supabase
    .from("debts")
    .select("id, type, creditor, principal, start_date, term_months, interest_rate, notes, is_active")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (debts ?? []).map((d) => d.id);
  const { data: payments, error: paymentError } = await supabase
    .from("debt_payments")
    .select("debt_id, amount")
    .eq("user_id", user.id)
    .in("debt_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  if (paymentError) throw new Error(paymentError.message);

  const map = new Map<string, number>();
  (payments ?? []).forEach((payment) => {
    const prev = map.get(payment.debt_id) ?? 0;
    map.set(payment.debt_id, prev + Number(payment.amount));
  });

  return (debts ?? []).map((debt) => {
    const paid = map.get(debt.id) ?? 0;
    return {
      ...debt,
      paid,
      balance: Math.max(Number(debt.principal) - paid, 0)
    };
  });
}

export async function getDebtDetail(debtId: string) {
  const { supabase, user } = await getCurrentUser();
  const { data: debt, error } = await supabase
    .from("debts")
    .select("id, type, creditor, principal, start_date, term_months, interest_rate, notes, is_active")
    .eq("user_id", user.id)
    .eq("id", debtId)
    .is("deleted_at", null)
    .single();
  if (error) throw new Error(error.message);

  const { data: payments, error: paymentError } = await supabase
    .from("debt_payments")
    .select("id, payment_date, amount, notes")
    .eq("user_id", user.id)
    .eq("debt_id", debtId)
    .order("payment_date", { ascending: false });
  if (paymentError) throw new Error(paymentError.message);

  const totalPaid = (payments ?? []).reduce((acc, payment) => acc + Number(payment.amount), 0);
  const balance = Math.max(Number(debt.principal) - totalPaid, 0);

  return { debt, payments: payments ?? [], totalPaid, balance };
}

export async function getProfile() {
  const { supabase, user } = await getCurrentUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, monthly_income_goal")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function defaultDashboardRange() {
  return currentMonthRange();
}
