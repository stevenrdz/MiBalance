"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { categorySchema, type CategoryInput } from "@/lib/schemas/domain";

export function CategoryForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "EXPENSE",
      is_active: true
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });
    const json = await response.json();
    if (!response.ok) {
      setServerError(json.error ?? "No se pudo crear la categoría.");
      return;
    }
    form.reset({
      name: "",
      type: "EXPENSE",
      is_active: true
    });
    router.refresh();
  });

  return (
    <form className="space-y-3 rounded-xl border border-ink-100 bg-white p-4" onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold text-ink-800">Nueva categoría</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input placeholder="Nombre de categoría" {...form.register("name")} />
        <Select {...form.register("type")}>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Egreso</option>
        </Select>
        <Button isLoading={form.formState.isSubmitting} type="submit">
          Agregar
        </Button>
      </div>
      {form.formState.errors.name && (
        <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
      )}
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
    </form>
  );
}

