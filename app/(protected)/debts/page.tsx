import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { getDebtsWithStats } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

export default async function DebtsPage() {
  const debts = await getDebtsWithStats();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Deudas</h1>
          <p className="text-sm text-ink-600">Controla préstamos y avances en efectivo.</p>
        </div>
        <Link
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          href="/debts/new"
        >
          Nueva deuda
        </Link>
      </div>

      {debts.length === 0 ? (
        <EmptyState message="Aún no tienes deudas registradas." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt) => (
            <Card key={debt.id}>
              <p className="text-xs uppercase tracking-wide text-ink-500">
                {debt.type === "LOAN" ? "Préstamo" : "Avance en efectivo"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">{debt.creditor}</h2>
              <p className="mt-2 text-sm text-ink-600">Inicio: {formatDateEc(debt.start_date)}</p>
              <p className="text-sm text-ink-600">Principal: {formatCurrency(Number(debt.principal))}</p>
              <p className="text-sm text-ink-600">Pagado: {formatCurrency(Number(debt.paid))}</p>
              <p className="text-sm font-semibold text-ink-800">
                Saldo: {formatCurrency(Number(debt.balance))}
              </p>
              <Link
                className="mt-4 inline-flex rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
                href={`/debts/${debt.id}`}
              >
                Ver detalle
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

