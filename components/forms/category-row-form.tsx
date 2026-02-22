"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type CategoryRowFormProps = {
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    is_active: boolean;
  };
};

export function CategoryRowForm({ category }: CategoryRowFormProps) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [type, setType] = useState<"INCOME" | "EXPENSE">(category.type);
  const [active, setActive] = useState(category.is_active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        is_active: active
      })
    });

    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(json.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("¿Desactivar categoría?")) return;
    setLoading(true);
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    setLoading(false);
    if (!response.ok) return;
    router.refresh();
  };

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Input onChange={(event) => setName(event.target.value)} value={name} />
        <Select onChange={(event) => setType(event.target.value as "INCOME" | "EXPENSE")} value={type}>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Egreso</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" />
          Activa
        </label>
        <Button isLoading={loading} onClick={save} size="sm" type="button" variant="secondary">
          Guardar
        </Button>
        <Button isLoading={loading} onClick={remove} size="sm" type="button" variant="danger">
          Desactivar
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

