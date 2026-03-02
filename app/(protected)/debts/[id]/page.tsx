import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, Download, Eye } from "lucide-react";
import { DebtDocumentForm } from "@/components/forms/debt-document-form";
import { DebtForm } from "@/components/forms/debt-form";
import { DebtInstallmentGeneratorForm } from "@/components/forms/debt-installment-generator-form";
import { DebtInstallmentSettlementForm } from "@/components/forms/debt-installment-settlement-form";
import { DebtPaymentForm } from "@/components/forms/debt-payment-form";
import { DeactivateDebtButton } from "@/components/forms/deactivate-debt-button";
import { DeleteDebtButton } from "@/components/forms/delete-debt-button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { getDebtDetail } from "@/lib/data/queries";
import { formatCurrency, formatDateEc } from "@/lib/format";

type DebtDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
          className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700"
          href={previewUrl}
          rel="noreferrer"
          target="_blank"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ver</span>
        </a>
      ) : null}
      {downloadUrl ? (
        <a
          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
          href={downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Descargar</span>
        </a>
      ) : null}
      {label ? <span className="min-w-0 break-all text-xs text-ink-500">{label}</span> : null}
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

function getPageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    visibleRows: rows.slice(start, start + pageSize),
    start,
    end: Math.min(start + pageSize, rows.length)
  };
}

function withPageParam(
  debtId: string,
  params: Record<string, string | string[] | undefined>,
  key: string,
  page: number
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([paramKey, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) query.set(paramKey, normalized);
  });
  query.set(key, String(page));
  return `/debts/${debtId}?${query.toString()}`;
}

function TablePagination({
  debtId,
  pageKey,
  currentPage,
  totalPages,
  totalRows,
  start,
  end,
  params
}: {
  debtId: string;
  pageKey: string;
  currentPage: number;
  totalPages: number;
  totalRows: number;
  start: number;
  end: number;
  params: Record<string, string | string[] | undefined>;
}) {
  if (totalRows <= 10) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-600">
        Mostrando {start + 1} a {end} de {totalRows}
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Link
          className={`inline-flex min-w-[88px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold ${
            currentPage === 1
              ? "pointer-events-none bg-ink-100 text-ink-400"
              : "bg-ink-100 text-ink-800 hover:bg-ink-200"
          }`}
          href={withPageParam(debtId, params, pageKey, Math.max(1, currentPage - 1))}
        >
          Anterior
        </Link>
        <span className="text-sm font-semibold text-ink-700">
          {currentPage}/{totalPages}
        </span>
        <Link
          className={`inline-flex min-w-[88px] items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold ${
            currentPage === totalPages
              ? "pointer-events-none bg-ink-100 text-ink-400"
              : "bg-ink-100 text-ink-800 hover:bg-ink-200"
          }`}
          href={withPageParam(debtId, params, pageKey, Math.min(totalPages, currentPage + 1))}
        >
          Siguiente
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-700"
      }`}
    >
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function ResponsiveSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children
}: {
  title: string;
  description?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className="md:hidden">
        <details className="group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft" open={defaultOpen}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {badge ? (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                    {badge}
                  </span>
                ) : null}
              </div>
              {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
            </div>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-ink-100 p-3">{children}</div>
        </details>
      </div>
      <div className="hidden md:block space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          {badge ? (
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
              {badge}
            </span>
          ) : null}
        </div>
        {description ? <p className="text-sm text-ink-600">{description}</p> : null}
        {children}
      </div>
    </>
  );
}

export default async function DebtDetailPage({ params, searchParams }: DebtDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const detail = await getDebtDetail(id).catch(() => null);
  if (!detail) notFound();

  const persistedScheduleInstallments = detail.schedule.filter(hasPersistedId);
  const actionableInstallments = persistedScheduleInstallments.filter((item) => item.status !== "PAID");
  const paymentEligibleInstallments = detail.schedule
    .filter((item) => item.status !== "PAID")
    .map((item) => ({
      number: item.number,
      label: item.label,
      dueDate: item.dueDate,
      remainingAmount: Number(
        "remainingAmount" in item && item.remainingAmount != null
          ? item.remainingAmount
          : (item.scheduledAmount ?? 0) - item.paidAmount
      ),
      status: getStatusLabel(item.status)
    }));

  const canRegisterManualPayments =
    detail.debt.is_active && persistedScheduleInstallments.length === 0 && paymentEligibleInstallments.length > 0;

  const schedulePagination = paginateRows(
    detail.schedule as ScheduleRow[],
    getPageParam(resolvedSearchParams.schedulePage),
    10
  );
  const documentsPagination = paginateRows(
    detail.documents as DocumentRow[],
    getPageParam(resolvedSearchParams.documentsPage),
    10
  );
  const paymentsPagination = paginateRows(
    detail.payments as PaymentRow[],
    getPageParam(resolvedSearchParams.paymentsPage),
    10
  );

  const editContent = (
    <Card className="p-4 sm:p-5">
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
  );

  const actionsContent = detail.debt.is_active ? (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DebtDocumentForm debtId={detail.debt.id} debtType={detail.debt.type} />
        <DebtInstallmentGeneratorForm debtId={detail.debt.id} />
      </div>
      {actionableInstallments.length ? (
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
      {canRegisterManualPayments ? (
        <DebtPaymentForm debtId={detail.debt.id} installments={paymentEligibleInstallments} />
      ) : null}
    </div>
  ) : (
    <Card className="p-4">
      <p className="text-sm text-ink-600">
        Esta deuda esta inactiva. Reactivala si necesitas registrar nuevos documentos o letras.
      </p>
    </Card>
  );

  return (
    <section className="space-y-4 md:space-y-6">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">{detail.debt.creditor}</h1>
              <StatusBadge active={detail.debt.is_active} />
            </div>
            <p className="mt-1 text-sm text-ink-600">{getDebtTypeLabel(detail.debt.type)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DeactivateDebtButton debtId={detail.debt.id} isActive={detail.debt.is_active} />
            <DeleteDebtButton debtId={detail.debt.id} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase text-ink-500">Principal</p>
            <p className="mt-1.5 text-lg font-bold text-ink-900 sm:text-2xl">
              {formatCurrency(Number(detail.debt.principal))}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase text-ink-500">Pagado</p>
            <p className="mt-1.5 text-lg font-bold text-ink-900 sm:text-2xl">
              {formatCurrency(detail.totalPaid)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase text-ink-500">Saldo</p>
            <p className="mt-1.5 text-lg font-bold text-ink-900 sm:text-2xl">
              {formatCurrency(detail.balance)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase text-ink-500">Mes actual</p>
            <p className="mt-1.5 text-lg font-bold text-ink-900 sm:text-2xl">
              {detail.currentInstallmentProgress}
            </p>
          </Card>
        </div>
      </Card>

      <ResponsiveSection
        badge="Editable"
        description="Deja el formulario cerrado en movil y abrelo solo cuando debas cambiar algo."
        title="Editar deuda"
      >
        {editContent}
      </ResponsiveSection>

      <ResponsiveSection
        badge={detail.debt.is_active ? "Disponible" : "Solo lectura"}
        description="Agrupa las acciones operativas en una sola seccion para evitar scroll innecesario."
        title="Acciones"
      >
        {actionsContent}
      </ResponsiveSection>

      <ResponsiveSection
        badge={`${detail.schedule.length} registros`}
        defaultOpen
        description="Consulta las letras por bloques de 10 y abre las otras secciones solo cuando las necesites."
        title="Cronograma"
      >
        <DataTable<ScheduleRow>
          columns={[
            {
              key: "number",
              header: "Letra",
              mobilePrimary: true,
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
              mobileHidden: true,
              render: (row) => (
                <AttachmentLinks
                  downloadUrl={row.receiptDownloadUrl}
                  label={row.receiptFileName}
                  previewUrl={row.receiptPreviewUrl}
                />
              )
            }
          ]}
          footer={
            <TablePagination
              currentPage={schedulePagination.currentPage}
              debtId={detail.debt.id}
              end={schedulePagination.end}
              pageKey="schedulePage"
              params={resolvedSearchParams}
              start={schedulePagination.start}
              totalPages={schedulePagination.totalPages}
              totalRows={detail.schedule.length}
            />
          }
          keyExtractor={(row) => (row.id ? String(row.id) : String(row.number))}
          rows={schedulePagination.visibleRows}
        />
      </ResponsiveSection>

      <ResponsiveSection
        badge={`${detail.documents.length} archivos`}
        description="Mantiene visibles solo los datos importantes en movil y deja la descarga al toque."
        title="Documentos"
      >
        <DataTable<DocumentRow>
          columns={[
            {
              key: "file_name",
              header: "Documento",
              mobilePrimary: true,
              render: (row) => row.file_name
            },
            {
              key: "mime_type",
              header: "Tipo",
              mobileHidden: true,
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
          footer={
            <TablePagination
              currentPage={documentsPagination.currentPage}
              debtId={detail.debt.id}
              end={documentsPagination.end}
              pageKey="documentsPage"
              params={resolvedSearchParams}
              start={documentsPagination.start}
              totalPages={documentsPagination.totalPages}
              totalRows={detail.documents.length}
            />
          }
          keyExtractor={(row) => row.id}
          rows={documentsPagination.visibleRows}
        />
      </ResponsiveSection>

      <ResponsiveSection
        badge={`${detail.payments.length} pagos`}
        description="La vista movil prioriza fecha, letra y monto para no estirar cada tarjeta."
        title="Pagos"
      >
        <DataTable<PaymentRow>
          columns={[
            {
              key: "payment_date",
              header: "Fecha",
              mobilePrimary: true,
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
              mobileHidden: true,
              render: (row) => row.notes ?? "-"
            },
            {
              key: "receipt_file_name",
              header: "Comprobante",
              mobileHidden: true,
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
          footer={
            <TablePagination
              currentPage={paymentsPagination.currentPage}
              debtId={detail.debt.id}
              end={paymentsPagination.end}
              pageKey="paymentsPage"
              params={resolvedSearchParams}
              start={paymentsPagination.start}
              totalPages={paymentsPagination.totalPages}
              totalRows={detail.payments.length}
            />
          }
          keyExtractor={(row) => row.id}
          rows={paymentsPagination.visibleRows}
        />
      </ResponsiveSection>
    </section>
  );
}
