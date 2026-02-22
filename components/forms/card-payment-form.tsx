"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cardPaymentSchema, type CardPaymentInput } from "@/lib/schemas/domain";

type CardPaymentFormProps = {
  cardId: string;
};

export function CardPaymentForm({ cardId }: CardPaymentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CardPaymentInput>({
    resolver: zodResolver(cardPaymentSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      notes: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch(`/api/cards/${cardId}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo registrar el pago.");
      return;
    }

    form.reset({
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      notes: ""
    });
    router.refresh();
  });

  return (
    <form className="space-y-3 rounded-xl border border-ink-100 bg-white p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-ink-800">Registrar pago</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input type="date" {...form.register("date")} />
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

