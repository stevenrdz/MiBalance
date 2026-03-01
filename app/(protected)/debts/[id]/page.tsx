import { notFound } from "next/navigation";
import { DebtDocumentForm } from "@/components/forms/debt-document-form";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtInstallmentGeneratorForm } from "@/components/forms/debt-installment-generator-form";
import { DebtInstallmentSettlementForm } from "@/components/forms/debt-installment-settlement-form";
import { DeactivateDebtButton } from "@/components/forms/deactivate-debt-button";
import { DeleteDebtButton } from "@/components/forms/delete-debt-button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getDebtDetail } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type DebtDetailPageProps = {
  params: Promise<{ id: string }>;
};

type ScheduleRow = {
  id?: string;
  number: number;
  label: string;
  dueDate: string;
  scheduledAmount: number | null;
  paidAmount: number;
  status: string;
  receiptFileName?: string | null;
  receiptPreviewUrl?: string | null;
  receiptDownloadUrl?: string | null;
};

type DocumentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  created_at: string;
  preview_url?: string | null;
  download_url?: string | null;
};

type PaymentRow = {
  id: string;
  payment_date: string;
  installment_number?: number | null;
  payment_method?: string | null;
  notes?: string | null;
  receipt_file_name?: string | null;
  preview_url?: string | null;
  download_url?: string | null;
  amount: number | string;
};

function AttachmentLinks({
  previewUrl,
  downloadUrl,
  label
}: {
  previewUrl?: string | null;
  downloadUrl?: string | null;
  label?: string | null;
}) {
  if (!previewUrl && !downloadUrl) return <span>-</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {previewUrl ? (
        <a
          className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-700"
          href={previewUrl}
          rel="noreferrer"
          target="_blank"
        >
          Ver
        </a>
      ) : null}
      {downloadUrl ? (
        <a
          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          href={downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          Descargar
        </a>
      ) : null}
      {label ? <span className="text-xs text-ink-500">{label}</span> : null}
    </div>
  );
}

function hasPersistedId(item: unknown): item is {
  id: string;
  number: number;
  label: string;
  dueDate: string;
  remainingAmount: number | null;
  scheduledAmount: number | null;
  status: string;
} {
  return !!item && typeof item === "object" && "id" in item && typeof item.id === "string";
}

function getDebtTypeLabel(type: string) {
  if (type === "LOAN") return "Prestamo";
  if (type === "DEFERRED") return "Diferido";
  return "Avance en efectivo";
}

function getStatusLabel(status: string) {
  if (status === "OVERDUE") return "Vencida";
  if (status === "PENDING") return "Pendiente";
  if (status === "PARTIAL") return "Pago parcial";
  if (status === "PAID") return "Pagada";
  if (status === "HISTORICAL") return "Historica";
  return "Proxima";
}

export default async function DebtDetailPage({ params }: DebtDetailPageProps) {
  const { id } = await params;
  const detail = await getDebtDetail(id).catch(() => null);
  if (!detail) notFound();

  const actionableInstallments = detail.schedule
    .filter(hasPersistedId)
    .filter((item) => item.status !== "PAID");

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{detail.debt.creditor}</h1>
          <p className="text-sm text-ink-600">
            {getDebtTypeLabel(detail.debt.type)} · {detail.debt.is_active ? "Activa" : "Inactiva"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeactivateDebtButton debtId={detail.debt.id} isActive={detail.debt.is_active} />
          <DeleteDebtButton debtId={detail.debt.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
        <Card>
          <p className="text-xs font-semibold uppercase text-ink-500">Mes actual</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">{detail.currentInstallmentProgress}</p>
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
            installment_amount: detail.debt.installment_amount,
            payment_day: detail.debt.payment_day,
            current_installment: detail.debt.current_installment,
            interest_rate: detail.debt.interest_rate,
            notes: detail.debt.notes ?? ""
          }}
          mode="edit"
        />
      </Card>

      {detail.debt.is_active ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DebtDocumentForm debtId={detail.debt.id} debtType={detail.debt.type} />
          <DebtInstallmentGeneratorForm debtId={detail.debt.id} />
        </div>
      ) : (
        <Card>
          <p className="text-sm text-ink-600">
            Esta deuda está inactiva. Reactívala si necesitas registrar nuevos documentos o letras.
          </p>
        </Card>
      )}

      {detail.debt.is_active && actionableInstallments.length ? (
        <DebtInstallmentSettlementForm
          debtId={detail.debt.id}
          installments={actionableInstallments.map((item) => {
            const persisted = item as {
              id: string;
              number: number;
              label: string;
              dueDate: string;
              remainingAmount: number | null;
              scheduledAmount: number | null;
              status: string;
            };
            return {
              id: persisted.id,
              number: persisted.number,
              label: persisted.label,
              dueDate: persisted.dueDate,
              remainingAmount: Number(persisted.remainingAmount ?? persisted.scheduledAmount ?? 0),
              status: getStatusLabel(persisted.status)
            };
          })}
        />
      ) : null}

      <DataTable<ScheduleRow>
        columns={[
          {
            key: "number",
            header: "Letra",
            render: (row) => row.label
          },
          {
            key: "dueDate",
            header: "Vence",
            render: (row) => formatDateEc(row.dueDate)
          },
          {
            key: "scheduledAmount",
            header: "Programado",
            render: (row) =>
              row.scheduledAmount != null ? formatCurrency(Number(row.scheduledAmount)) : "-"
          },
          {
            key: "paidAmount",
            header: "Pagado",
            render: (row) => formatCurrency(Number(row.paidAmount))
          },
          {
            key: "status",
            header: "Estado",
            render: (row) => getStatusLabel(row.status)
          },
          {
            key: "receiptFileName",
            header: "Comprobante",
            render: (row) => (
              <AttachmentLinks
                downloadUrl={row.receiptDownloadUrl}
                label={row.receiptFileName}
                previewUrl={row.receiptPreviewUrl}
              />
            )
          }
        ]}
        keyExtractor={(row) => (row.id ? String(row.id) : String(row.number))}
        rows={detail.schedule as ScheduleRow[]}
      />

      <DataTable<DocumentRow>
        columns={[
          {
            key: "file_name",
            header: "Documento",
            render: (row) => row.file_name
          },
          {
            key: "mime_type",
            header: "Tipo",
            render: (row) => row.mime_type
          },
          {
            key: "created_at",
            header: "Subido",
            render: (row) => formatDateEc(row.created_at)
          },
          {
            key: "preview_url",
            header: "Archivo",
            render: (row) => (
              <AttachmentLinks
                downloadUrl={row.download_url}
                label={row.file_name}
                previewUrl={row.preview_url}
              />
            )
          }
        ]}
        emptyMessage="Aun no hay documentos cargados para esta deuda."
        keyExtractor={(row) => row.id}
        rows={detail.documents as DocumentRow[]}
      />

      <DataTable<PaymentRow>
        columns={[
          {
            key: "payment_date",
            header: "Fecha",
            render: (row) => formatDateEc(row.payment_date)
          },
          {
            key: "installment_number",
            header: "Letra",
            render: (row) => (row.installment_number ? `Letra ${row.installment_number}` : "-")
          },
          {
            key: "payment_method",
            header: "Metodo",
            render: (row) => row.payment_method ?? "-"
          },
          {
            key: "notes",
            header: "Notas",
            render: (row) => row.notes ?? "-"
          },
          {
            key: "receipt_file_name",
            header: "Comprobante",
            render: (row) => (
              <AttachmentLinks
                downloadUrl={row.download_url}
                label={row.receipt_file_name ?? "Sin archivo"}
                previewUrl={row.preview_url}
              />
            )
          },
          {
            key: "amount",
            header: "Monto",
            render: (row) => formatCurrency(Number(row.amount))
          }
        ]}
        keyExtractor={(row) => row.id}
        rows={detail.payments as PaymentRow[]}
      />
    </section>
  );
}
