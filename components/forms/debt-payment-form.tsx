"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debtPaymentSchema, type DebtPaymentInput } from "@/lib/schemas/domain";

type DebtPaymentFormProps = {
  debtId: string;
};

export function DebtPaymentForm({ debtId }: DebtPaymentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<DebtPaymentInput>({
    resolver: zodResolver(debtPaymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      notes: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/debts/${debtId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo guardar el pago.");
      return;
    }

    form.reset({
      payment_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      notes: ""
    });
    router.refresh();
  });

  return (
    <form className="space-y-3 rounded-xl border border-ink-100 bg-white p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-ink-800">Registrar pago de deuda</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input type="date" {...form.register("payment_date")} />
        <Input min="0.01" step="0.01" type="number" {...form.register("amount")} />
        <Input placeholder="Notas (opcional)" {...form.register("notes")} />
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button isLoading={form.formState.isSubmitting} size="sm" type="submit">
        Guardar pago
      </Button>
    </form>
  );
}

