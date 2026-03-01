import Link from "next/link";
import { Pencil } from "lucide-react";
import { DeleteTransactionButton } from "@/components/forms/delete-transaction-button";
import { TransactionsFilters } from "@/components/forms/transactions-filters";
import { EmptyState } from "@/components/states/empty-state";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { defaultDashboardRange, getCategories, getTransactions } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const defaultRange = defaultDashboardRange();
  const categories = await getCategories();
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const q = typeof params.q === "string" ? params.q : undefined;
  const from = typeof params.from === "string" ? params.from : defaultRange.from;
  const to = typeof params.to === "string" ? params.to : defaultRange.to;
  const type = typeof params.type === "string" ? params.type : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const paymentMethod =
    typeof params.paymentMethod === "string" ? params.paymentMethod : undefined;

  const data = await getTransactions({ page, q, from, to, type, categoryId, paymentMethod });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Movimientos</h1>
          <p className="text-sm text-ink-600">
            Gestiona ingresos y egresos con filtros, búsqueda y adjuntos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            href="/transactions/new?type=INCOME"
          >
            Nuevo ingreso
          </Link>
          <Link
            className="inline-flex rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800"
            href="/transactions/new?type=EXPENSE"
          >
            Nuevo egreso
          </Link>
        </div>
      </div>

      <TransactionsFilters
        categories={categories}
        defaultFrom={defaultRange.from}
        defaultTo={defaultRange.to}
      />

      {data.rows.length === 0 ? (
        <EmptyState message="No hay movimientos para los filtros seleccionados." />
      ) : (
        <DataTable
          columns={[
            {
              key: "date",
              header: "Fecha",
              render: (row) => formatDateEc(row.date)
            },
            {
              key: "type",
              header: "Tipo",
              render: (row) =>
                row.type === "INCOME" ? (
                  <span className="rounded-md bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800">
                    Ingreso
                  </span>
                ) : (
                  <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                    Egreso
                  </span>
                )
            },
            {
              key: "amount",
              header: "Monto",
              render: (row) => formatCurrency(Number(row.amount))
            },
            {
              key: "category",
              header: "Categoría",
              render: (row) => {
                const category = Array.isArray(row.category) ? row.category[0] : row.category;
                return category?.name ?? "Sin categoría";
              }
            },
            {
              key: "payment_method",
              header: "Método",
              render: (row) => row.payment_method
            },
            {
              key: "merchant",
              header: "Comercio",
              render: (row) => row.merchant ?? "-"
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) => (
                <div className="flex gap-2">
                  <Link
                    aria-label="Editar movimiento"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ink-100 text-ink-700 hover:bg-ink-200"
                    href={`/transactions/${row.id}/edit`}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Link>
                  <DeleteTransactionButton transactionId={row.id} />
                </div>
              )
            }
          ]}
          keyExtractor={(row) => row.id}
          rows={data.rows}
        />
      )}

      <Pagination
        basePath="/transactions"
        page={data.page}
        pageSize={data.pageSize}
        query={{ q, from, to, type, categoryId, paymentMethod }}
        total={data.total}
      />

      <Card>
        <p className="text-xs text-ink-500">
          Total registros: <strong className="text-ink-800">{data.total}</strong>
        </p>
      </Card>
    </section>
  );
}
