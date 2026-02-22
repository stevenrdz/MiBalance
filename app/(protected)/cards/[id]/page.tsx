import { notFound } from "next/navigation";
import { CardForm } from "@/components/forms/card-form";
import { CardPaymentForm } from "@/components/forms/card-payment-form";
import { DeactivateCardButton } from "@/components/forms/deactivate-card-button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getCardDetail } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type CardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params;
  const detail = await getCardDetail(id).catch(() => null);
  if (!detail) notFound();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{detail.card.name}</h1>
          <p className="text-sm text-ink-600">
            Ciclo actual: {detail.cycle.start} a {detail.cycle.end}
          </p>
        </div>
        <DeactivateCardButton cardId={detail.card.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Consumos</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {formatCurrency(detail.summary.totalConsumptions)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Pagos</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {formatCurrency(detail.summary.totalPayments)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Por pagar</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {formatCurrency(detail.summary.totalPending)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-ink-900">Editar tarjeta</h2>
        <CardForm
          cardId={detail.card.id}
          initialData={{
            name: detail.card.name,
            credit_limit: Number(detail.card.credit_limit),
            statement_day: detail.card.statement_day,
            payment_day: detail.card.payment_day
          }}
          mode="edit"
        />
      </Card>

      <CardPaymentForm cardId={detail.card.id} />

      <DataTable
        columns={[
          {
            key: "date",
            header: "Fecha",
            render: (row) => formatDateEc(row.date)
          },
          {
            key: "merchant",
            header: "Comercio",
            render: (row) => row.merchant ?? "-"
          },
          {
            key: "description",
            header: "Descripción",
            render: (row) => row.description ?? "-"
          },
          {
            key: "amount",
            header: "Monto",
            render: (row) => formatCurrency(Number(row.amount))
          }
        ]}
        keyExtractor={(row) => row.id}
        rows={detail.consumptions}
      />

      <DataTable
        columns={[
          {
            key: "date",
            header: "Fecha pago",
            render: (row) => formatDateEc(row.date)
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
