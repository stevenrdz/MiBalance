"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildDebtSchedule } from "@/lib/debt-schedule";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { debtSchema, type DebtInput } from "@/lib/schemas/domain";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type DraftInstallment = {
  installment_number: number;
  due_date: string;
  scheduled_amount: number;
  paid: boolean;
  paid_at: string;
};

type DebtType = DebtInput["type"];

const TYPE_COPY: Record<
  DebtType,
  {
    title: string;
    documentLabel: string;
    documentDescription: string;
    scheduleTitle: string;
    scanHint: string;
  }
> = {
  LOAN: {
    title: "Préstamo",
    documentLabel: "Documentos del préstamo",
    documentDescription:
      "Puedes subir contrato y tabla de amortización juntos. La app combina ambos y completa el formulario antes de guardar.",
    scheduleTitle: "Letras detectadas",
    scanHint: "Sube el PDF del préstamo o la tabla de amortización para autocompletar la mayor parte del formulario."
  },
  CASH_ADVANCE: {
    title: "Avance en efectivo",
    documentLabel: "Documentos del avance",
    documentDescription:
      "Sube contrato, tabla o estado donde aparezcan las letras del avance para completar el plan de pagos.",
    scheduleTitle: "Letras del avance",
    scanHint: "Sube el estado o contrato del avance para detectar cuotas, fechas y montos."
  },
  DEFERRED: {
    title: "Diferido",
    documentLabel: "Documentos del diferido",
    documentDescription:
      "Sube comprobantes o estados del diferido para detectar cuotas, fechas y montos automáticamente.",
    scheduleTitle: "Cuotas detectadas",
    scanHint: "Sube el estado de cuenta o comprobante del diferido para autocompletar el plan de pagos."
  }
};

export function DebtOnboardingForm() {
  const INSTALLMENTS_PAGE_SIZE = 10;
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentChecked, setDocumentChecked] = useState(false);
  const [installments, setInstallments] = useState<DraftInstallment[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [installmentsSourceFileName, setInstallmentsSourceFileName] = useState<string | null>(null);
  const [installmentsPage, setInstallmentsPage] = useState(1);

  const form = useForm<DebtInput>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      type: "LOAN",
      creditor: "",
      principal: 0,
      start_date: new Date().toISOString().slice(0, 10),
      term_months: null,
      installment_amount: null,
      payment_day: null,
      current_installment: 1,
      interest_rate: null,
      notes: ""
    }
  });

  const selectedType = form.watch("type");
  const watchedCreditor = form.watch("creditor");
  const watchedPrincipal = form.watch("principal");
  const watchedStartDate = form.watch("start_date");
  const watchedTermMonths = form.watch("term_months");
  const watchedInstallmentAmount = form.watch("installment_amount");
  const watchedPaymentDay = form.watch("payment_day");
  const watchedCurrentInstallment = form.watch("current_installment");
  const selectedCopy = TYPE_COPY[selectedType];
  const today = new Date().toISOString().slice(0, 10);

  const previewRows = useMemo(() => {
    if (installments.length) return installments;
    if (!watchedTermMonths || !watchedInstallmentAmount || !watchedStartDate) {
      return [];
    }

    return buildDebtSchedule({
      startDate: watchedStartDate,
      termMonths: watchedTermMonths ?? null,
      paymentDay: watchedPaymentDay ?? null,
      installmentAmount: watchedInstallmentAmount ?? null,
      currentInstallment: watchedCurrentInstallment,
      payments: []
    }).map((item) => ({
      installment_number: item.number,
      due_date: item.dueDate,
      scheduled_amount: Number(item.scheduledAmount ?? 0),
      paid: false,
      paid_at: ""
    }));
  }, [
    installments,
    watchedCurrentInstallment,
    watchedInstallmentAmount,
    watchedPaymentDay,
    watchedStartDate,
    watchedTermMonths
  ]);

  const updatePreviewRow = (index: number, updater: (row: DraftInstallment) => DraftInstallment) => {
    setInstallments((current) => {
      const base = current.length ? current : previewRows;
      return base.map((row, rowIndex) => (rowIndex === index ? updater(row) : row));
    });
  };

  const resetAnalysisState = () => {
    setDocumentChecked(false);
    setInstallments([]);
    setInstallmentsSourceFileName(null);
  };

  const analyzeDocument = async () => {
    if (documentFiles.length === 0) {
      toast.error(`Selecciona al menos un PDF o imagen de ${selectedCopy.title.toLowerCase()}.`);
      return;
    }

    setAnalyzing(true);
    setServerError(null);
    try {
      const payload = new FormData();
      documentFiles.forEach((file) => payload.append("files", file));
      payload.set("expectedType", selectedType);
      const response = await fetch("/api/ocr/loan-document", {
        method: "POST",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo analizar el documento.");
      }
      if (!json.isRelevant) {
        resetAnalysisState();
        toast.error(json.reason ?? `Los documentos no parecen corresponder a ${selectedCopy.title.toLowerCase()}.`);
        return;
      }

      setDocumentChecked(true);
      setInstallmentsSourceFileName(json.installments_source_file_name ?? null);
      if (json.detectedType && ["LOAN", "CASH_ADVANCE", "DEFERRED"].includes(json.detectedType)) {
        form.setValue("type", json.detectedType, { shouldDirty: true });
      }

      if (json.creditor) form.setValue("creditor", json.creditor, { shouldDirty: true });
      if (json.principal) form.setValue("principal", Number(json.principal), { shouldDirty: true });
      if (json.term_months) form.setValue("term_months", Number(json.term_months), { shouldDirty: true });
      if (json.installment_amount) {
        form.setValue("installment_amount", Number(json.installment_amount), { shouldDirty: true });
      }
      if (json.interest_rate != null) {
        form.setValue("interest_rate", Number(json.interest_rate), { shouldDirty: true });
      }
      if (json.start_date) form.setValue("start_date", json.start_date, { shouldDirty: true });
      if (Array.isArray(json.installments) && json.installments.length) {
        setInstallments(
          json.installments.map(
            (item: {
              installment_number: number;
              due_date: string;
              scheduled_amount: number;
            }) => ({
              ...item,
              paid: false,
              paid_at: ""
            })
          )
        );
        form.setValue("term_months", json.installments.length, { shouldDirty: true });
      }

      toast.success("Documentos analizados. Revisa y ajusta los datos antes de guardar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo analizar el documento.");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadDocuments = async (debtId: string) => {
    if (documentFiles.length === 0) return new Map<string, string>();

    const uploaded = new Map<string, string>();

    for (const documentFile of documentFiles) {
      const payload = new FormData();
      payload.set("file", documentFile);
      const response = await fetch(`/api/debts/${debtId}/documents`, {
        method: "POST",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar el documento.");
      uploaded.set(documentFile.name, json.id as string);
    }

    return uploaded;
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (documentFiles.length > 0 && !documentChecked) {
        toast.error("Analiza los documentos antes de guardar la deuda.");
        return;
      }

      const response = await fetch("/api/debts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });
      const json = await response.json();
      if (!response.ok) {
        setServerError(json.error ?? "No se pudo guardar la deuda.");
        toast.error(json.error ?? "No se pudo guardar la deuda.");
        return;
      }

      const debtId = json.id as string;
      const documentIds = await uploadDocuments(debtId);
      const installmentDocumentId =
        (installmentsSourceFileName ? documentIds.get(installmentsSourceFileName) : null) ??
        documentIds.values().next().value ??
        null;

      for (const installment of previewRows) {
        const createResponse = await fetch(`/api/debts/${debtId}/installments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            installment_number: installment.installment_number,
            due_date: installment.due_date,
            scheduled_amount: installment.scheduled_amount,
            document_id: installmentDocumentId
          })
        });
        const installmentJson = await createResponse.json();
        if (!createResponse.ok) {
          throw new Error(installmentJson.error ?? "No se pudo guardar una letra.");
        }

        if (installment.paid) {
          const settleResponse = await fetch(`/api/debts/${debtId}/installments/${installmentJson.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              status: "PAID",
              paid_amount: installment.scheduled_amount,
              paid_at: installment.paid_at,
              payment_method: "transfer",
              notes: "Marcada como pagada durante la carga inicial"
            })
          });
          const settleJson = await settleResponse.json();
          if (!settleResponse.ok) {
            throw new Error(settleJson.error ?? "No se pudo marcar una letra como pagada.");
          }
        }
      }

      toast.success(`${selectedCopy.title} registrada correctamente.`);
      router.push(`/debts/${debtId}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el registro.";
      setServerError(message);
      toast.error(message);
    }
  });

  const scanStatusCopy = documentChecked
    ? "Escaneo completado"
    : documentFiles.length > 0
      ? "Archivo listo para escanear"
      : "Sin documento cargado";
  const totalInstallmentPages = Math.max(1, Math.ceil(previewRows.length / INSTALLMENTS_PAGE_SIZE));
  const paginatedPreviewRows = previewRows.slice(
    (installmentsPage - 1) * INSTALLMENTS_PAGE_SIZE,
    installmentsPage * INSTALLMENTS_PAGE_SIZE
  );

  useEffect(() => {
    setInstallmentsPage((current) => Math.min(current, totalInstallmentPages));
  }, [totalInstallmentPages]);

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <Card className="border-0 bg-gradient-to-br from-emerald-100 via-white to-amber-50 p-6">
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-soft">
                Paso 1 · Sube el documento
              </div>
              <h2 className="text-2xl font-bold text-ink-900">Escanea el PDF antes de llenar la deuda</h2>
              <p className="max-w-3xl text-sm text-ink-700">{selectedCopy.scanHint}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Estado</p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  documentChecked
                    ? "text-emerald-700"
                    : documentFiles.length > 0
                      ? "text-amber-700"
                      : "text-ink-700"
                }`}
              >
                {scanStatusCopy}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/85 p-5 shadow-soft">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_auto_auto]">
              <Input
                className="bg-white"
                accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  if (selected.length === 0) {
                    setDocumentFiles([]);
                    resetAnalysisState();
                    return;
                  }
                  const invalid = selected.find(
                    (file) =>
                      !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
                        file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]
                      ) || file.size > MAX_ATTACHMENT_SIZE_BYTES
                  );
                  if (invalid) {
                    toast.error("Todos los archivos deben ser PDF, JPG o PNG y no superar 5MB.");
                    return;
                  }
                  setDocumentFiles(selected);
                  resetAnalysisState();
                }}
                type="file"
              />
              <Button className="min-w-[200px]" isLoading={analyzing} onClick={() => void analyzeDocument()} type="button">
                Escanear y autocompletar
              </Button>
              <Button
                onClick={() => {
                  setDocumentFiles([]);
                  resetAnalysisState();
                  toast.success("Puedes continuar completando la deuda manualmente.");
                }}
                type="button"
                variant="secondary"
              >
                Seguir manualmente
              </Button>
            </div>

            {documentFiles.length > 0 ? (
              <div className="mt-4 space-y-3 rounded-2xl bg-ink-50 p-4">
                <div className="flex flex-wrap gap-2">
                  {documentFiles.map((file) => (
                    <span
                      className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700"
                      key={file.name}
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      documentChecked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                    >
                      {documentChecked ? "Escaneo completado" : "Listo para escanear"}
                    </span>
                  {installmentsSourceFileName ? (
                    <span className="text-xs text-ink-600">
                      Cuotas detectadas desde: <strong>{installmentsSourceFileName}</strong>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-ink-600">
                Sube primero el documento para autocompletar. Si no lo tienes a mano, puedes continuar manualmente.
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
              <p className="text-sm font-semibold text-ink-900">1. Sube el PDF o imagen</p>
              <p className="mt-1 text-sm text-ink-600">La app usa el documento para adelantarte el registro.</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
              <p className="text-sm font-semibold text-ink-900">2. Revisa lo detectado</p>
              <p className="mt-1 text-sm text-ink-600">Confirma acreedor, principal, plazo, cuotas y fechas.</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-soft">
              <p className="text-sm font-semibold text-ink-900">3. Ajusta antes de guardar</p>
              <p className="mt-1 text-sm text-ink-600">Corrige cualquier dato y marca cuotas ya pagadas si aplica.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Paso 2 · Confirma los datos principales</h2>
            <p className="text-sm text-ink-600">
              Ajusta lo detectado o completa manualmente los datos base de {selectedCopy.title.toLowerCase()}.
            </p>
          </div>
          <div className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">
            Autocompletado editable
          </div>
        </div>

        {documentFiles.length > 0 && !documentChecked ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Sube el documento y pulsa <strong>Escanear y autocompletar</strong> antes de continuar para aprovechar el OCR.
          </div>
        ) : null}

        {documentChecked ? (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Tipo detectado</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{TYPE_COPY[selectedType].title}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Acreedor</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{watchedCreditor || "Pendiente"}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Principal</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">
                {watchedPrincipal ? `$${Number(watchedPrincipal).toFixed(2)}` : "Pendiente"}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Cuotas detectadas</p>
              <p className="mt-1 text-sm font-semibold text-ink-900">{previewRows.length || 0}</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Tipo</label>
            <Select
              {...form.register("type")}
              onChange={(event) => {
                const nextType = event.target.value as DebtType;
                form.setValue("type", nextType, { shouldDirty: true });
                resetAnalysisState();
              }}
            >
              <option value="LOAN">Préstamo</option>
              <option value="CASH_ADVANCE">Avance en efectivo</option>
              <option value="DEFERRED">Diferido</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Acreedor</label>
            <Input placeholder="Ej: Banco Guayaquil" {...form.register("creditor")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Principal</label>
            <Input min="0.01" step="0.01" type="number" {...form.register("principal")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Fecha inicio</label>
            <Input type="date" {...form.register("start_date")} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Plazo (meses)</label>
            <Input min="1" step="1" type="number" {...form.register("term_months")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Interés %</label>
            <Input min="0" step="0.01" type="number" {...form.register("interest_rate")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Cuota mensual</label>
            <Input min="0.01" step="0.01" type="number" {...form.register("installment_amount")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Día de pago</label>
            <Input min="1" max="31" step="1" type="number" {...form.register("payment_day")} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Mes actual de pago</label>
            <Input min="1" step="1" type="number" {...form.register("current_installment")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Notas</label>
            <Input placeholder="Observaciones opcionales" {...form.register("notes")} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Paso 3 · Revisa el plan de pagos</h2>
            <p className="text-sm text-ink-600">
              {previewRows.length
                ? "Confirma las cuotas detectadas o generadas. Puedes corregir fechas, montos y marcar las ya pagadas."
                : "Cuando completes plazo, cuota y fecha de inicio, aquí aparecerá la vista previa de las cuotas."}
            </p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {previewRows.length ? `${previewRows.length} cuotas` : "Pendiente"}
          </div>
        </div>

        {previewRows.length ? (
          <div className="space-y-3">
            {paginatedPreviewRows.map((item, index) => {
              const absoluteIndex = (installmentsPage - 1) * INSTALLMENTS_PAGE_SIZE + index;
              const overdue = !item.paid && item.due_date < new Date().toISOString().slice(0, 10);
              return (
                <div
                  className="grid grid-cols-1 gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-4 md:grid-cols-[90px_150px_170px_120px_150px_120px]"
                  key={`${item.installment_number}-${absoluteIndex}`}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">Cuota</label>
                    <Input
                      onChange={(event) =>
                        updatePreviewRow(absoluteIndex, (row) => ({
                          ...row,
                          installment_number: Number(event.target.value)
                        }))
                      }
                      type="number"
                      value={item.installment_number}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">Vence</label>
                    <Input
                      onChange={(event) =>
                        updatePreviewRow(absoluteIndex, (row) => ({ ...row, due_date: event.target.value }))
                      }
                      type="date"
                      value={item.due_date}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">Monto</label>
                    <Input
                      onChange={(event) =>
                        updatePreviewRow(absoluteIndex, (row) => ({
                          ...row,
                          scheduled_amount: Number(event.target.value)
                        }))
                      }
                      step="0.01"
                      type="number"
                      value={item.scheduled_amount}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input
                        checked={item.paid}
                        className="size-4"
                        onChange={(event) =>
                          updatePreviewRow(absoluteIndex, (row) => ({
                            ...row,
                            paid: event.target.checked,
                            paid_at: event.target.checked ? row.paid_at || today : ""
                          }))
                        }
                        type="checkbox"
                      />
                      Pagada
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">
                      Fecha pagada
                    </label>
                    <Input
                      disabled={!item.paid}
                      max={today}
                      onChange={(event) =>
                        updatePreviewRow(absoluteIndex, (row) => ({ ...row, paid_at: event.target.value }))
                      }
                      placeholder={item.paid ? undefined : "Pendiente"}
                      type="date"
                      value={item.paid_at}
                    />
                  </div>
                  <div className="flex items-end">
                    <span
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        item.paid
                          ? "bg-emerald-100 text-emerald-700"
                          : overdue
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.paid ? "Pagada" : overdue ? "Vencida" : "Pendiente"}
                    </span>
                  </div>
                </div>
              );
            })}

            {totalInstallmentPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3">
                <p className="text-sm text-ink-600">
                  Mostrando cuotas {(installmentsPage - 1) * INSTALLMENTS_PAGE_SIZE + 1} a{" "}
                  {Math.min(installmentsPage * INSTALLMENTS_PAGE_SIZE, previewRows.length)} de {previewRows.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={installmentsPage === 1}
                    onClick={() => setInstallmentsPage((current) => Math.max(1, current - 1))}
                    type="button"
                    variant="secondary"
                  >
                    Anteriores 10
                  </Button>
                  <div className="inline-flex items-center rounded-lg bg-ink-100 px-3 py-2 text-sm font-semibold text-ink-700">
                    Página {installmentsPage} de {totalInstallmentPages}
                  </div>
                  <Button
                    disabled={installmentsPage === totalInstallmentPages}
                    onClick={() =>
                      setInstallmentsPage((current) => Math.min(totalInstallmentPages, current + 1))
                    }
                    type="button"
                    variant="secondary"
                  >
                    Siguientes 10
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-6 text-sm text-ink-600">
            Completa al menos <strong>fecha de inicio</strong>, <strong>plazo</strong> y <strong>cuota mensual</strong>{" "}
            para generar la vista previa del calendario.
          </div>
        )}
      </Card>

      {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button className="min-w-[180px]" isLoading={form.formState.isSubmitting} type="submit">
          Guardar deuda
        </Button>
        <Button onClick={() => router.push("/debts")} type="button" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
