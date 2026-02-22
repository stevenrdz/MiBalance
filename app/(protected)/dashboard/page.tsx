import { DashboardFilters } from "@/components/forms/dashboard-filters";
import { ExpensesChart } from "@/components/dashboard/expenses-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { EmptyState } from "@/components/states/empty-state";
import { getCategories, getDashboardData, defaultDashboardRange } from "@/lib/data/queries";
import { formatCurrency } from "@/lib/format";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const defaultRange = defaultDashboardRange();
  const categories = await getCategories();
  const data = await getDashboardData({
    from: typeof params.from === "string" ? params.from : defaultRange.from,
    to: typeof params.to === "string" ? params.to : defaultRange.to,
    type: typeof params.type === "string" ? params.type : undefined,
    categoryId: typeof params.categoryId === "string" ? params.categoryId : undefined,
    paymentMethod: typeof params.paymentMethod === "string" ? params.paymentMethod : undefined
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-600">
          Resumen financiero en USD para el rango {data.filters.from} a {data.filters.to}.
        </p>
      </div>

      <DashboardFilters
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        defaultFrom={defaultRange.from}
        defaultTo={defaultRange.to}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Ingresos" value={formatCurrency(data.totals.totalIncome)} />
        <SummaryCard title="Egresos" value={formatCurrency(data.totals.totalExpense)} />
        <SummaryCard title="Balance" value={formatCurrency(data.totals.balance)} />
        <SummaryCard
          title="Tarjetas por pagar"
          value={formatCurrency(data.totals.totalCardToPay)}
          helper="Consumos - pagos"
        />
        <SummaryCard title="Deuda total" value={formatCurrency(data.totals.totalDebt)} />
      </div>

      {data.expensesByCategory.length ? (
        <ExpensesChart byCategory={data.expensesByCategory} trend={data.trend} />
      ) : (
        <EmptyState message="Aún no hay egresos en el rango seleccionado para graficar." />
      )}
    </section>
  );
}

