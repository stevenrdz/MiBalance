"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildDebtSchedule } from "@/lib/debt-schedule";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/browser";
import { debtSchema, type DebtInput } from "@/lib/schemas/domain";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
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

type AnalysisFieldSource = {
  file_name: string;
  document_category?: string;
} | null;

type AnalysisDocument = {
  file_name: string;
  isRelevant: boolean;
  reason?: string;
  document_category?: string;
  creditor?: string;
  principal?: number;
  term_months?: number;
  installment_amount?: number;
  interest_rate?: number;
  start_date?: string;
  installments: Array<{
    installment_number: number;
    due_date: string;
    scheduled_amount: number;
  }>;
};

const TYPE_COPY: Record<
  DebtType,
  {
    title: string;
    documentLabel: string;
    documentDescription: string;
    scheduleTitle: string;
  }
> = {
  LOAN: {
    title: "Prestamo",
    documentLabel: "Documentos del prestamo",
    documentDescription:
      "Puedes subir contrato y tabla de amortizacion juntos. La app fusiona ambos y prioriza la tabla para letras y el contrato para datos generales si hace falta.",
    scheduleTitle: "Letras detectadas"
  },
  CASH_ADVANCE: {
    title: "Avance en efectivo",
    documentLabel: "Documentos del avance",
    documentDescription:
      "Sube contrato, tabla o estado donde aparezcan las letras del avance para completar el plan de pagos.",
    scheduleTitle: "Letras del avance"
  },
  DEFERRED: {
    title: "Diferido",
    documentLabel: "Documentos del diferido",
    documentDescription:
      "Sube comprobantes o estados del diferido. Si hay varias fuentes, la app te muestra de cual documento salio cada dato.",
    scheduleTitle: "Cuotas detectadas"
  }
};

function getCategoryLabel(category?: string) {
  if (category === "AMORTIZATION_TABLE") return "Tabla de amortizacion";
  if (category === "CONTRACT") return "Contrato";
  if (category === "STATEMENT") return "Estado de cuenta";
  return "Documento";
}

function renderSource(source: AnalysisFieldSource) {
  if (!source) return "Manual";
  return `${source.file_name} · ${getCategoryLabel(source.document_category)}`;
}

export function DebtOnboardingForm() {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documentChecked, setDocumentChecked] = useState(false);
  const [installments, setInstallments] = useState<DraftInstallment[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisDocuments, setAnalysisDocuments] = useState<AnalysisDocument[]>([]);
  const [fieldSources, setFieldSources] = useState<Record<string, AnalysisFieldSource>>({});
  const [installmentsSourceFileName, setInstallmentsSourceFileName] = useState<string | null>(null);

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
  const selectedCopy = TYPE_COPY[selectedType];

  const previewRows = useMemo(() => {
    if (installments.length) return installments;
    const values = form.getValues();
    if (!values.term_months || !values.installment_amount || !values.start_date) {
      return [];
    }

    return buildDebtSchedule({
      startDate: values.start_date,
      termMonths: values.term_months ?? null,
      paymentDay: values.payment_day ?? null,
      installmentAmount: values.installment_amount ?? null,
      currentInstallment: values.current_installment,
      payments: []
    }).map((item) => ({
      installment_number: item.number,
      due_date: item.dueDate,
      scheduled_amount: Number(item.scheduledAmount ?? 0),
      paid: false,
      paid_at: new Date().toISOString().slice(0, 10)
    }));
  }, [form, installments]);

  const updatePreviewRow = (index: number, updater: (row: DraftInstallment) => DraftInstallment) => {
    setInstallments((current) => {
      const base = current.length ? current : previewRows;
      return base.map((row, rowIndex) => (rowIndex === index ? updater(row) : row));
    });
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
        setDocumentChecked(false);
        setInstallments([]);
        setAnalysisDocuments(json.documents ?? []);
        toast.error(json.reason ?? `Los documentos no parecen corresponder a ${selectedCopy.title.toLowerCase()}.`);
        return;
      }

      setDocumentChecked(true);
      setAnalysisDocuments(json.documents ?? []);
      setFieldSources(json.field_sources ?? {});
      setInstallmentsSourceFileName(json.installments_source_file_name ?? null);

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
              paid_at: new Date().toISOString().slice(0, 10)
            })
          )
        );
        form.setValue("term_months", json.installments.length, { shouldDirty: true });
      }

      toast.success("Documentos analizados. Revisa la comparacion y ajusta antes de guardar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo analizar el documento.");
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadDocuments = async (debtId: string) => {
    if (documentFiles.length === 0) return new Map<string, string>();

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesion no encontrada.");

    const uploaded = new Map<string, string>();

    for (const documentFile of documentFiles) {
      const path = `${user.id}/debt-documents/${debtId}/${crypto.randomUUID()}-${documentFile.name}`;
      const { error: uploadError } = await supabase.storage.from("attachments").upload(path, documentFile, {
        cacheControl: "3600",
        upsert: false
      });
      if (uploadError) throw new Error(uploadError.message);

      const response = await fetch(`/api/debts/${debtId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          file_name: documentFile.name,
          file_path: path,
          mime_type: documentFile.type,
          size_bytes: documentFile.size
        })
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

  const fieldSummary = [
    {
      label: "Acreedor",
      value: form.watch("creditor") || "Sin dato",
      source: renderSource(fieldSources.creditor ?? null)
    },
    {
      label: "Principal",
      value: form.watch("principal") ? Number(form.watch("principal")).toFixed(2) : "Sin dato",
      source: renderSource(fieldSources.principal ?? null)
    },
    {
      label: "Plazo",
      value: form.watch("term_months") ? `${form.watch("term_months")} meses` : "Sin dato",
      source: renderSource(fieldSources.term_months ?? null)
    },
    {
      label: "Cuota",
      value: form.watch("installment_amount")
        ? Number(form.watch("installment_amount")).toFixed(2)
        : "Sin dato",
      source: renderSource(fieldSources.installment_amount ?? null)
    },
    {
      label: "Interes %",
      value: form.watch("interest_rate") != null ? String(form.watch("interest_rate")) : "Sin dato",
      source: renderSource(fieldSources.interest_rate ?? null)
    },
    {
      label: "Fecha inicio",
      value: form.watch("start_date") || "Sin dato",
      source: renderSource(fieldSources.start_date ?? null)
    }
  ];

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Tipo</label>
            <Select
              {...form.register("type")}
              onChange={(event) => {
                const nextType = event.target.value as DebtType;
                form.setValue("type", nextType, { shouldDirty: true });
                setDocumentFiles([]);
                setDocumentChecked(false);
                setInstallments([]);
                setAnalysisDocuments([]);
                setFieldSources({});
                setInstallmentsSourceFileName(null);
              }}
            >
              <option value="LOAN">Prestamo</option>
              <option value="CASH_ADVANCE">Avance en efectivo</option>
              <option value="DEFERRED">Diferido</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Acreedor</label>
            <Input placeholder="Ej: Banco Guayaquil" {...form.register("creditor")} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{selectedCopy.documentLabel}</h2>
            <p className="text-sm text-ink-600">{selectedCopy.documentDescription}</p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 shadow-soft">
            Paso 1
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <Input
            accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
            multiple
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              if (selected.length === 0) {
                setDocumentFiles([]);
                setDocumentChecked(false);
                setAnalysisDocuments([]);
                setFieldSources({});
                setInstallmentsSourceFileName(null);
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
              setDocumentChecked(false);
              setAnalysisDocuments([]);
              setFieldSources({});
              setInstallmentsSourceFileName(null);
            }}
            type="file"
          />
          <Button isLoading={analyzing} onClick={() => void analyzeDocument()} type="button">
            Analizar documentos
          </Button>
        </div>
        {documentFiles.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {documentFiles.map((file) => (
                <span
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 shadow-soft"
                  key={file.name}
                >
                  {file.name}
                </span>
              ))}
            </div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                documentChecked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {documentChecked ? "Analizados" : "Pendientes de analisis"}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-xs text-ink-500">
            Puedes continuar manualmente si todavia no tienes los documentos.
          </p>
        )}
      </div>

      {analysisDocuments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Comparativa de documentos</h2>
                <p className="text-sm text-ink-600">
                  Aqui ves lo que extrajo cada archivo antes de fusionar los datos.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {analysisDocuments.map((document) => (
                <div className="rounded-xl border border-ink-100 bg-ink-50 p-4" key={document.file_name}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink-900">{document.file_name}</h3>
                      <p className="text-xs text-ink-500">
                        {getCategoryLabel(document.document_category)}
                        {document.isRelevant ? " · valido" : " · no valido"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        document.isRelevant
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {document.isRelevant ? "Detectado" : "Descartado"}
                    </span>
                  </div>
                  {document.reason ? <p className="mt-2 text-xs text-red-600">{document.reason}</p> : null}
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-ink-500">Acreedor</p>
                      <p className="font-medium text-ink-800">{document.creditor ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-500">Principal</p>
                      <p className="font-medium text-ink-800">
                        {document.principal != null ? document.principal.toFixed(2) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-500">Plazo</p>
                      <p className="font-medium text-ink-800">{document.term_months ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-500">Cuota</p>
                      <p className="font-medium text-ink-800">
                        {document.installment_amount != null
                          ? document.installment_amount.toFixed(2)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-500">Interes %</p>
                      <p className="font-medium text-ink-800">
                        {document.interest_rate != null ? document.interest_rate : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-500">Inicio</p>
                      <p className="font-medium text-ink-800">{document.start_date ?? "-"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ink-500">
                    Letras detectadas: {document.installments.length}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-ink-900">Origen del autofill</h2>
            <p className="mt-1 text-sm text-ink-600">
              Esta fusion prioriza la tabla para letras y el mejor documento disponible para cada campo.
            </p>
            <div className="mt-4 space-y-3">
              {fieldSummary.map((field) => (
                <div className="rounded-xl border border-ink-100 bg-ink-50 p-3" key={field.label}>
                  <p className="text-xs uppercase text-ink-500">{field.label}</p>
                  <p className="mt-1 font-semibold text-ink-900">{field.value}</p>
                  <p className="mt-1 text-xs text-ink-500">{field.source}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
              La fusion es segura: no guarda nada automaticamente en base de datos. Solo propone valores en el
              formulario y puedes corregirlos antes de crear la deuda.
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Datos de la deuda</h2>
            <p className="text-sm text-ink-600">
              Ajusta lo detectado o completa manualmente el plan de pagos de {selectedCopy.title.toLowerCase()}.
            </p>
          </div>
          <div className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-600">Paso 2</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Principal</label>
            <Input min="0.01" step="0.01" type="number" {...form.register("principal")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Fecha inicio</label>
            <Input type="date" {...form.register("start_date")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Plazo (meses)</label>
            <Input min="1" step="1" type="number" {...form.register("term_months")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Interes %</label>
            <Input min="0" step="0.01" type="number" {...form.register("interest_rate")} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Cuota mensual</label>
            <Input min="0.01" step="0.01" type="number" {...form.register("installment_amount")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Dia de pago</label>
            <Input min="1" max="31" step="1" type="number" {...form.register("payment_day")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Mes actual de pago</label>
            <Input min="1" step="1" type="number" {...form.register("current_installment")} />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-ink-700">Notas</label>
          <Input placeholder="Observaciones opcionales" {...form.register("notes")} />
        </div>
      </div>

      {previewRows.length ? (
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{selectedCopy.scheduleTitle}</h2>
              <p className="text-sm text-ink-600">
                Revisa las cuotas, marca las pagadas y el estado vencido se calcula segun la fecha.
              </p>
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Paso 3
            </div>
          </div>

          <div className="space-y-3">
            {previewRows.map((item, index) => {
              const overdue = !item.paid && item.due_date < new Date().toISOString().slice(0, 10);
              return (
                <div
                  className="grid grid-cols-1 gap-3 rounded-xl border border-ink-100 bg-ink-50 p-3 md:grid-cols-[100px_150px_160px_120px_140px_120px]"
                  key={`${item.installment_number}-${index}`}
                >
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">Letra</label>
                    <Input
                      onChange={(event) =>
                        updatePreviewRow(index, (row) => ({
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
                        updatePreviewRow(index, (row) => ({ ...row, due_date: event.target.value }))
                      }
                      type="date"
                      value={item.due_date}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">Monto</label>
                    <Input
                      onChange={(event) =>
                        updatePreviewRow(index, (row) => ({
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
                          updatePreviewRow(index, (row) => ({ ...row, paid: event.target.checked }))
                        }
                        type="checkbox"
                      />
                      Pagada
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-ink-500">
                      Fecha pago
                    </label>
                    <Input
                      disabled={!item.paid}
                      onChange={(event) =>
                        updatePreviewRow(index, (row) => ({ ...row, paid_at: event.target.value }))
                      }
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
          </div>
        </div>
      ) : null}

      {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

      <div className="flex gap-2">
        <Button isLoading={form.formState.isSubmitting} type="submit">
          Crear deuda
        </Button>
        <Button onClick={() => router.push("/debts")} type="button" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
