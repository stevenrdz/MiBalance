"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import {
  settleDebtInstallmentSchema,
  type SettleDebtInstallmentInput
} from "@/lib/schemas/domain";

type InstallmentOption = {
  id: string;
  number: number;
  label: string;
  dueDate: string;
  remainingAmount: number;
  status: string;
};

export function DebtInstallmentSettlementForm({
  debtId,
  installments
}: {
  debtId: string;
  installments: InstallmentOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);

  const first = installments[0];

  const form = useForm<SettleDebtInstallmentInput>({
    resolver: zodResolver(settleDebtInstallmentSchema),
    defaultValues: {
      status: "PAID",
      paid_amount: first?.remainingAmount ?? 0,
      paid_at: new Date().toISOString().slice(0, 10),
      payment_method: "transfer",
      notes: ""
    }
  });

  const [installmentId, setInstallmentId] = useState(first?.id ?? "");

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const payload = new FormData();
      payload.set("status", values.status);
      payload.set("paid_amount", String(values.paid_amount));
      payload.set("paid_at", values.paid_at ?? "");
      payload.set("payment_method", values.payment_method ?? "");
      payload.set("notes", values.notes ?? "");
      if (receipt) payload.set("receipt", receipt);

      const response = await fetch(`/api/debts/${debtId}/installments/${installmentId}`, {
        method: "PATCH",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "No se pudo confirmar la letra.");
      setReceipt(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar la letra.");
    }
  });

  return (
    <form className="space-y-3 rounded-xl border border-ink-100 bg-white p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-ink-800">Confirmar letra</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select
          onChange={(event) => {
            const nextId = event.target.value;
            setInstallmentId(nextId);
            const selected = installments.find((item) => item.id === nextId);
            if (selected) {
              form.setValue("paid_amount", selected.remainingAmount, { shouldDirty: true });
            }
          }}
          value={installmentId}
        >
          {installments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} | vence {item.dueDate} | {item.status}
            </option>
          ))}
        </Select>
        <Select {...form.register("status")}>
          <option value="PAID">Pagada</option>
          <option value="PARTIAL">Parcial</option>
          <option value="PENDING">Pendiente</option>
        </Select>
        <Input type="date" {...form.register("paid_at")} />
        <Input min="0" step="0.01" type="number" {...form.register("paid_amount")} />
        <Select {...form.register("payment_method")}>
          <option value="transfer">Transferencia</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
        </Select>
      </div>
      <Input placeholder="Notas del pago" {...form.register("notes")} />
      <Input
        accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (!selected) {
            setReceipt(null);
            return;
          }
          if (
            !ALLOWED_ATTACHMENT_MIME_TYPES.includes(selected.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]) ||
            selected.size > MAX_ATTACHMENT_SIZE_BYTES
          ) {
            setError("El comprobante debe ser jpg, png o pdf de máximo 5MB.");
            return;
          }
          setReceipt(selected);
        }}
        type="file"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full sm:w-auto" isLoading={form.formState.isSubmitting} size="sm" type="submit">
        Confirmar letra
      </Button>
    </form>
  );
}
