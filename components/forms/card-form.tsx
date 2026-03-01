"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cardSchema, type CardInput } from "@/lib/schemas/domain";

type CardFormProps = {
  mode: "create" | "edit";
  cardId?: string;
  initialData?: Partial<CardInput>;
};

export function CardForm({ mode, cardId, initialData }: CardFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CardInput>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      credit_limit: initialData?.credit_limit ?? 0,
      statement_day: initialData?.statement_day ?? 1,
      payment_day: initialData?.payment_day ?? 1,
      minimum_payment_amount: initialData?.minimum_payment_amount ?? null,
      payment_due_date: initialData?.payment_due_date ?? null
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const endpoint = mode === "create" ? "/api/cards" : `/api/cards/${cardId}`;
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
      setServerError(json.error ?? "No se pudo guardar la tarjeta.");
      return;
    }

    router.push(mode === "create" ? "/cards" : `/cards/${cardId}`);
    router.refresh();
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Nombre</label>
        <Input placeholder="Ej: Banco Pichincha Visa" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Cupo credito (USD)</label>
          <Input min="0.01" step="0.01" type="number" {...form.register("credit_limit")} />
          {form.formState.errors.credit_limit && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.credit_limit.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Dia de corte</label>
          <Input max="31" min="1" step="1" type="number" {...form.register("statement_day")} />
          {form.formState.errors.statement_day && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.statement_day.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Dia de pago</label>
          <Input max="31" min="1" step="1" type="number" {...form.register("payment_day")} />
          {form.formState.errors.payment_day && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.payment_day.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Pago minimo actual</label>
          <Input min="0.01" step="0.01" type="number" {...form.register("minimum_payment_amount")} />
          <p className="mt-1 text-xs text-ink-500">
            Monto minimo exigido en el estado de cuenta actual.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Fecha maxima de pago</label>
          <Input type="date" {...form.register("payment_due_date")} />
          <p className="mt-1 text-xs text-ink-500">
            Fecha limite del corte actual. El dia de pago es la referencia habitual de tu ciclo.
          </p>
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <Button isLoading={form.formState.isSubmitting} type="submit">
          {mode === "create" ? "Crear tarjeta" : "Actualizar tarjeta"}
        </Button>
        <Button onClick={() => router.push("/cards")} type="button" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
