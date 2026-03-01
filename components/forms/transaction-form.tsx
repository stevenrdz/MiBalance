"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { transactionSchema, type TransactionInput } from "@/lib/schemas/domain";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants";
import {
  matchCategoryByHint,
  type ReceiptAutofill
} from "@/lib/ocr/receipt-parser";
import { createClient } from "@/lib/supabase/browser";

type CategoryOption = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
};

type CardOption = {
  id: string;
  name: string;
};

type ExistingAttachment = {
  id: string;
  file_name: string;
  file_path: string;
};

type TransactionFormProps = {
  mode: "create" | "edit";
  categories: CategoryOption[];
  cards: CardOption[];
  transactionId?: string;
  initialData?: Partial<TransactionInput>;
  existingAttachments?: ExistingAttachment[];
};

export function TransactionForm({
  mode,
  categories,
  cards,
  transactionId,
  initialData,
  existingAttachments = []
}: TransactionFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState(existingAttachments);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<ReceiptAutofill | null>(null);
  const [ocrProvider, setOcrProvider] = useState<"openai" | "tesseract" | null>(null);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      type: initialData?.type ?? "EXPENSE",
      amount: initialData?.amount ?? 0,
      category_id: initialData?.category_id ?? "",
      payment_method: initialData?.payment_method ?? "cash",
      card_id: initialData?.card_id ?? null,
      merchant: initialData?.merchant ?? "",
      description: initialData?.description ?? ""
    }
  });

  const selectedType = form.watch("type");
  const selectedPaymentMethod = form.watch("payment_method");
  const hasImageForOcr = files.some((file) => file.type.startsWith("image/"));

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType]
  );

  const uploadFiles = async (savedTransactionId: string) => {
    if (!files.length) return;
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión no encontrada para cargar adjuntos.");

    for (const file of files) {
      const path = `${user.id}/${savedTransactionId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("attachments").upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });
      if (uploadError) throw new Error(uploadError.message);

      const { error: dbError } = await supabase.from("attachments").insert({
        user_id: user.id,
        transaction_id: savedTransactionId,
        file_name: file.name,
        file_path: path,
        mime_type: file.type,
        size_bytes: file.size
      });
      if (dbError) throw new Error(dbError.message);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const endpoint = mode === "create" ? "/api/transactions" : `/api/transactions/${transactionId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...values,
        card_id: values.payment_method === "card" ? values.card_id : null
      })
    });

    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo guardar la transacción.");
      return;
    }

    const savedId = mode === "create" ? json.id : transactionId;
    if (!savedId) {
      setServerError("No se recibió el ID de la transacción.");
      return;
    }

    try {
      await uploadFiles(savedId);
      router.push("/transactions");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Error cargando adjuntos.");
    }
  });

  const handleAttachmentDelete = async (attachmentId: string) => {
    const response = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
    if (!response.ok) return;
    setAttachments((current) => current.filter((item) => item.id !== attachmentId));
    router.refresh();
  };

  const analyzeReceipt = async (imageFileOverride?: File) => {
    setServerError(null);
    const imageFile = imageFileOverride ?? files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      setServerError("Selecciona al menos una imagen (jpg/png) para analizar.");
      return;
    }

    setOcrLoading(true);
    try {
      const payload = new FormData();
      payload.set("file", imageFile);
      payload.set("type", form.getValues("type"));
      const response = await fetch("/api/ocr/receipt", {
        method: "POST",
        body: payload
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo analizar la factura.");
      }

      const detected = (json.autofill ?? {}) as ReceiptAutofill;
      setOcrProvider(json.provider === "openai" ? "openai" : "tesseract");
      setOcrPreview(detected);

      if (detected.amount) {
        form.setValue("amount", Number(detected.amount.toFixed(2)), {
          shouldValidate: true,
          shouldDirty: true
        });
      }

      if (detected.date) {
        form.setValue("date", detected.date, { shouldValidate: true, shouldDirty: true });
      }

      if (detected.merchant) {
        form.setValue("merchant", detected.merchant, { shouldDirty: true });
      }

      if (detected.description) {
        form.setValue("description", detected.description, { shouldDirty: true });
      }

      if (detected.paymentMethod) {
        form.setValue("payment_method", detected.paymentMethod, { shouldDirty: true });
        if (detected.paymentMethod !== "card") {
          form.setValue("card_id", null, { shouldDirty: true });
        }
      }

      const categoryId = matchCategoryByHint(
        detected.categoryNameHint,
        categories,
        form.getValues("type")
      );
      if (categoryId) {
        form.setValue("category_id", categoryId, { shouldValidate: true, shouldDirty: true });
      }
    } catch (error) {
      setServerError(
        error instanceof Error
          ? `No se pudo analizar la factura: ${error.message}`
          : "No se pudo analizar la factura."
      );
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Fecha</label>
          <Input type="date" {...form.register("date")} />
          {form.formState.errors.date && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.date.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Monto (USD)</label>
          <Input min="0.01" step="0.01" type="number" {...form.register("amount")} />
          {form.formState.errors.amount && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Tipo</label>
          <Select {...form.register("type")}>
            <option value="INCOME">Ingreso</option>
            <option value="EXPENSE">Egreso</option>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Categoría</label>
          <Select {...form.register("category_id")}>
            <option value="">Seleccionar</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          {form.formState.errors.category_id && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.category_id.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Método de pago</label>
          <Select {...form.register("payment_method")}>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
          </Select>
        </div>
      </div>

      {selectedPaymentMethod === "card" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Tarjeta</label>
          <Select {...form.register("card_id")}>
            <option value="">Seleccionar tarjeta</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </Select>
          {form.formState.errors.card_id && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.card_id.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Comercio (opcional)</label>
          <Input placeholder="Ej: Supermaxi" {...form.register("merchant")} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">
            Descripción (opcional)
          </label>
          <Input placeholder="Detalle del movimiento" {...form.register("description")} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          Adjuntos (jpg/png/pdf, máx 5MB c/u)
        </label>
        <Input
          multiple
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            const invalid = selected.find(
              (file) =>
                !ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as never) ||
                file.size > MAX_ATTACHMENT_SIZE_BYTES
            );
            if (invalid) {
              setServerError(
                `Archivo inválido: ${invalid.name}. Solo jpg/png/pdf y máximo 5MB por archivo.`
              );
              return;
            }
            setFiles(selected);
            setOcrPreview(null);
            setOcrProvider(null);
            const firstImage = selected.find((file) => file.type.startsWith("image/"));
            if (firstImage) {
              void analyzeReceipt(firstImage);
            }
          }}
          type="file"
        />
        {hasImageForOcr && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              isLoading={ocrLoading}
              onClick={() => void analyzeReceipt()}
              size="sm"
              type="button"
              variant="secondary"
            >
              Reanalizar primera imagen
            </Button>
            <p className="text-xs text-ink-500">
              OCR server-side: usa IA si OPENAI_API_KEY está configurada.
            </p>
          </div>
        )}

        {ocrPreview && (
          <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
            <p className="font-semibold text-ink-800">Sugerencias detectadas</p>
            <p>Fecha: {ocrPreview.date ?? "-"}</p>
            <p>Monto: {ocrPreview.amount ? ocrPreview.amount.toFixed(2) : "-"}</p>
            <p>Comercio: {ocrPreview.merchant ?? "-"}</p>
            <p>Método: {ocrPreview.paymentMethod ?? "-"}</p>
            <p>Categoría sugerida: {ocrPreview.categoryNameHint ?? "-"}</p>
            <p>Fuente: {ocrProvider === "openai" ? "IA (OpenAI)" : "OCR (Tesseract)"}</p>
          </div>
        )}

        {!!attachments.length && (
          <div className="mt-2 space-y-2 rounded-lg border border-ink-100 bg-ink-50 p-3">
            {attachments.map((item) => (
              <div className="flex items-center justify-between text-sm" key={item.id}>
                <span>{item.file_name}</span>
                <Button
                  onClick={() => handleAttachmentDelete(item.id)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-2">
        <Button isLoading={form.formState.isSubmitting} type="submit">
          {mode === "create" ? "Guardar movimiento" : "Actualizar movimiento"}
        </Button>
        <Button onClick={() => router.push("/transactions")} type="button" variant="secondary">
          Cancelar
        </Button>
      </div>
    </form>
  );
}
