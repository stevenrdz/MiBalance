import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { getDebtsWithStats } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type DebtsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getDebtTypeLabel(type: string) {
  if (type === "LOAN") return "Prestamo";
  if (type === "DEFERRED") return "Diferido";
  return "Avance en efectivo";
}

function getStatusHref(status: "all" | "active" | "inactive") {
  if (status === "all") return "/debts";
  return `/debts?status=${status}`;
}

export default async function DebtsPage({ searchParams }: DebtsPageProps) {
  const params = await searchParams;
  const requestedStatus = typeof params.status === "string" ? params.status : "all";
  const status =
    requestedStatus === "active" || requestedStatus === "inactive" ? requestedStatus : "all";
  const debts = await getDebtsWithStats(status);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Deudas</h1>
          <p className="text-sm text-ink-600">
            Controla prestamos, avances en efectivo y diferidos por cuota.
          </p>
        </div>
        <Link
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          href="/debts/new"
        >
          Nueva deuda
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { value: "all", label: "Todas" },
          { value: "active", label: "Activas" },
          { value: "inactive", label: "Inactivas" }
        ] as const).map((option) => {
          const isCurrent = status === option.value;

          return (
            <Link
              key={option.value}
              className={
                isCurrent
                  ? "inline-flex rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                  : "inline-flex rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300 hover:bg-ink-50"
              }
              href={getStatusHref(option.value)}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {debts.length === 0 ? (
        <EmptyState
          message={
            status === "all"
              ? "Aun no tienes deudas registradas."
              : status === "active"
                ? "No tienes deudas activas."
                : "No tienes deudas inactivas."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {debts.map((debt) => (
            <Card key={debt.id}>
              <p className="text-xs uppercase tracking-wide text-ink-500">{getDebtTypeLabel(debt.type)}</p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">{debt.creditor}</h2>
              <p className="mt-1 text-sm font-medium text-ink-700">
                Estado: {debt.is_active ? "Activa" : "Inactiva"}
              </p>
              <p className="mt-2 text-sm text-ink-600">Inicio: {formatDateEc(debt.start_date)}</p>
              <p className="text-sm text-ink-600">Principal: {formatCurrency(Number(debt.principal))}</p>
              <p className="text-sm text-ink-600">Pagado: {formatCurrency(Number(debt.paid))}</p>
              <p className="text-sm text-ink-600">
                Mes actual: {debt.current_installment}
                {debt.term_months ? `/${debt.term_months}` : ""}
              </p>
              {debt.installment_amount ? (
                <p className="text-sm text-ink-600">
                  Cuota: {formatCurrency(Number(debt.installment_amount))}
                </p>
              ) : null}
              {debt.nextInstallment ? (
                <p className="text-sm text-ink-600">
                  Siguiente: {debt.nextInstallment.label} - {formatDateEc(debt.nextInstallment.dueDate)}
                </p>
              ) : null}
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
