"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";

function getDebtDocumentCopy(type: "LOAN" | "CASH_ADVANCE" | "DEFERRED") {
  if (type === "CASH_ADVANCE") {
    return {
      title: "Documento del avance",
      description: "Sube contrato, tabla o estado de cuenta para asociarlo al avance en efectivo."
    };
  }
  if (type === "DEFERRED") {
    return {
      title: "Documento del diferido",
      description: "Sube comprobantes o estados de cuenta para asociarlos al diferido."
    };
  }
  return {
    title: "Documento del préstamo",
    description: "Sube contrato, tabla de amortización o estado de cuenta para asociarlo a la deuda."
  };
}

export function DebtDocumentForm({
  debtId,
  debtType
}: {
  debtId: string;
  debtType: "LOAN" | "CASH_ADVANCE" | "DEFERRED";
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const copy = getDebtDocumentCopy(debtType);

  const onUpload = async () => {
    if (!file) {
      setError("Selecciona un PDF o imagen del préstamo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.set("file", file);
      const response = await fetch(`/api/debts/${debtId}/documents`, {
        method: "POST",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar el documento.");

      const generationResponse = await fetch(`/api/debts/${debtId}/installments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode: "generate", document_id: json.id })
      });
      const generationJson = await generationResponse.json();
      if (!generationResponse.ok) {
        throw new Error(
          generationJson.error ??
            "El documento se subió, pero no se pudieron generar las letras automáticamente."
        );
      }

      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el documento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-ink-100 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-800">{copy.title}</h3>
        <p className="text-xs text-ink-500">{copy.description}</p>
      </div>
      <Input
        accept={ALLOWED_ATTACHMENT_MIME_TYPES.join(",")}
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (!selected) {
            setFile(null);
            return;
          }
          if (
            !ALLOWED_ATTACHMENT_MIME_TYPES.includes(selected.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number]) ||
            selected.size > MAX_ATTACHMENT_SIZE_BYTES
          ) {
            setError("El documento debe ser jpg, png o pdf de máximo 5MB.");
            return;
          }
          setFile(selected);
        }}
        type="file"
      />
      {file ? <p className="text-xs text-ink-500">Archivo seleccionado: {file.name}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full sm:w-auto" isLoading={loading} onClick={onUpload} size="sm" type="button">
        Subir documento
      </Button>
    </div>
  );
}
