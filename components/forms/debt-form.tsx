"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { debtSchema, type DebtInput } from "@/lib/schemas/domain";

type DebtFormProps = {
  mode: "create" | "edit";
  debtId?: string;
  initialData?: Partial<DebtInput>;
};

export function DebtForm({ mode, debtId, initialData }: DebtFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<DebtInput>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      type: initialData?.type ?? "LOAN",
      creditor: initialData?.creditor ?? "",
      principal: initialData?.principal ?? 0,
      start_date: initialData?.start_date ?? new Date().toISOString().slice(0, 10),
      term_months: initialData?.term_months ?? null,
      installment_amount: initialData?.installment_amount ?? null,
      payment_day: initialData?.payment_day ?? null,
      current_installment: initialData?.current_installment ?? 1,
      interest_rate: initialData?.interest_rate ?? null,
      notes: initialData?.notes ?? ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const endpoint = mode === "create" ? "/api/debts" : `/api/debts/${debtId}`;
    const method = mode === "create" ? "POST" : "PATCH";
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo guardar la deuda.");
      return;
    }

    router.push(mode === "create" ? "/debts" : `/debts/${debtId}`);
    router.refresh();
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Tipo</label>
          <Select {...form.register("type")}>
            <option value="LOAN">Préstamo</option>
            <option value="CASH_ADVANCE">Avance en efectivo</option>
            <option value="DEFERRED">Diferido</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Acreedor</label>
          <Input placeholder="Ej: Banco Guayaquil" {...form.register("creditor")} />
          {form.formState.errors.creditor && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.creditor.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Principal</label>
          <Input min="0.01" step="0.01" type="number" {...form.register("principal")} />
          {form.formState.errors.principal && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.principal.message}</p>
          )}
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
          <label className="mb-1 block text-sm font-medium text-ink-700">Interés %</label>
          <Input min="0" step="0.01" type="number" {...form.register("interest_rate")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Cuota mensual</label>
          <Input min="0.01" step="0.01" type="number" {...form.register("installment_amount")} />
          {form.formState.errors.installment_amount && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.installment_amount.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Día de pago</label>
          <Input min="1" max="31" step="1" type="number" {...form.register("payment_day")} />
          {form.formState.errors.payment_day && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.payment_day.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Mes actual de pago</label>
          <Input min="1" step="1" type="number" {...form.register("current_installment")} />
          {form.formState.errors.current_installment && (
            <p className="mt-1 text-xs text-red-600">
              {form.formState.errors.current_installment.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Notas</label>
        <Input placeholder="Observaciones opcionales" {...form.register("notes")} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <Button isLoading={form.formState.isSubmitting} type="submit">
          {mode === "create" ? "Crear deuda" : "Actualizar deuda"}
        </Button>
        <Button onClick={() => router.push("/debts")} type="button" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
