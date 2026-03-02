"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DebtInstallmentGeneratorForm({
  debtId
}: {
  debtId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState({
    installment_number: "",
    due_date: "",
    scheduled_amount: "",
    notes: ""
  });

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/debts/${debtId}/installments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode: "generate" })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "No se pudieron generar las letras.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron generar las letras.");
    } finally {
      setLoading(false);
    }
  };

  const addManual = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/debts/${debtId}/installments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          installment_number: Number(manual.installment_number),
          due_date: manual.due_date,
          scheduled_amount: Number(manual.scheduled_amount),
          notes: manual.notes
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar la letra.");
      setManual({
        installment_number: "",
        due_date: "",
        scheduled_amount: "",
        notes: ""
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la letra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-ink-100 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-800">Letras del prestamo</h3>
        <p className="text-xs text-ink-500">
          Genera letras desde la configuracion actual de la deuda o registra letras manuales.
        </p>
      </div>

      <Button className="w-full sm:w-auto" isLoading={loading} onClick={generate} size="sm" type="button">
        Generar letras automaticamente
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          onChange={(event) =>
            setManual((current) => ({ ...current, installment_number: event.target.value }))
          }
          placeholder="Numero de letra"
          type="number"
          value={manual.installment_number}
        />
        <Input
          onChange={(event) => setManual((current) => ({ ...current, due_date: event.target.value }))}
          type="date"
          value={manual.due_date}
        />
        <Input
          onChange={(event) =>
            setManual((current) => ({ ...current, scheduled_amount: event.target.value }))
          }
          placeholder="Monto"
          type="number"
          value={manual.scheduled_amount}
        />
        <Input
          onChange={(event) => setManual((current) => ({ ...current, notes: event.target.value }))}
          placeholder="Notas"
          value={manual.notes}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full sm:w-auto" isLoading={loading} onClick={addManual} size="sm" type="button" variant="secondary">
        Agregar letra manual
      </Button>
    </div>
  );
}
