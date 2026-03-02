"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import { debtPaymentSchema, type DebtPaymentInput } from "@/lib/schemas/domain";

type InstallmentOption = {
  number: number;
  label: string;
  dueDate: string;
  remainingAmount: number | null;
  status: string;
};

type DebtPaymentFormProps = {
  debtId: string;
  installments: InstallmentOption[];
};

export function DebtPaymentForm({ debtId, installments }: DebtPaymentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);

  const defaultInstallment = installments[0]?.number ?? 1;

  const form = useForm<DebtPaymentInput>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      installment_number: defaultInstallment,
      amount: installments[0]?.remainingAmount ?? 0,
      payment_method: "transfer",
      notes: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

    try {
      const payload = new FormData();
      payload.set("payment_date", values.payment_date);
      payload.set("installment_number", String(values.installment_number));
      payload.set("amount", String(values.amount));
      payload.set("payment_method", values.payment_method);
      payload.set("notes", values.notes ?? "");
      if (receipt) payload.set("receipt", receipt);

      const response = await fetch(`/api/debts/${debtId}/payments`, {
        method: "POST",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) {
        setServerError(json.error ?? "No se pudo guardar el pago.");
        return;
      }

      form.reset({
        payment_date: new Date().toISOString().slice(0, 10),
        installment_number: defaultInstallment,
        amount: installments[0]?.remainingAmount ?? 0,
        payment_method: "transfer",
        notes: ""
      });
      setReceipt(null);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo guardar el pago.");
    }
  });

  return (
    <form className="space-y-3 rounded-xl border border-ink-100 bg-white p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-ink-800">Confirmar pago mensual</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input type="date" {...form.register("payment_date")} />
        <Select {...form.register("installment_number")}>
          {installments.map((item) => (
            <option key={item.number} value={item.number}>
              {item.label} | vence {item.dueDate} | {item.status}
            </option>
          ))}
        </Select>
        <Input min="0.01" step="0.01" type="number" {...form.register("amount")} />
        <Select {...form.register("payment_method")}>
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
        </Select>
      </div>
      <Input placeholder="Notas del pago" {...form.register("notes")} />
      <div className="space-y-1">
        <Input
          accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) {
              setReceipt(null);
              return;
            }
            if (
              !ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]) ||
              file.size > MAX_ATTACHMENT_SIZE_BYTES
            ) {
              setServerError("El comprobante debe ser jpg, png o pdf de máximo 5MB.");
              return;
            }
            setReceipt(file);
          }}
          type="file"
        />
        <p className="text-xs text-ink-500">
          Sube el comprobante para dejar confirmada la cuota pagada.
        </p>
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button className="w-full sm:w-auto" isLoading={form.formState.isSubmitting} size="sm" type="submit">
        Guardar pago
      </Button>
    </form>
  );
}
