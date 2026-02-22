import { notFound } from "next/navigation";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
import { DeactivateDebtButton } from "@/components/forms/deactivate-debt-button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getDebtDetail } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type DebtDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { id } = await params;
  const detail = await getDebtDetail(id).catch(() => null);
  if (!detail) notFound();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{detail.debt.creditor}</h1>
          <p className="text-sm text-ink-600">
            {detail.debt.type === "LOAN" ? "Préstamo" : "Avance en efectivo"}
          </p>
        </div>
        <DeactivateDebtButton debtId={detail.debt.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Principal</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {formatCurrency(Number(detail.debt.principal))}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Pagado</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{formatCurrency(detail.totalPaid)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Saldo</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{formatCurrency(detail.balance)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Editar deuda</h2>
        <DebtForm
          debtId={detail.debt.id}
          initialData={{
            type: detail.debt.type,
            creditor: detail.debt.creditor,
            principal: Number(detail.debt.principal),
            start_date: detail.debt.start_date,
            term_months: detail.debt.term_months,
            interest_rate: detail.debt.interest_rate,
            notes: detail.debt.notes ?? ""
          }}
          mode="edit"
        />
      </Card>

      <DebtPaymentForm debtId={detail.debt.id} />

      <DataTable
        columns={[
          {
            key: "payment_date",
            header: "Fecha",
            render: (row) => formatDateEc(row.payment_date)
          },
          {
            key: "notes",
            header: "Notas",
            render: (row) => row.notes ?? "-"
          },
          {
            key: "amount",
            header: "Monto",
            render: (row) => formatCurrency(Number(row.amount))
          }
        ]}
        keyExtractor={(row) => row.id}
        rows={detail.payments}
      />
    </section>
  );
}

