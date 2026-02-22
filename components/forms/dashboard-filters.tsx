"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select } from "@/components/ui/select";

type DashboardFiltersProps = {
  categories: Array<{ id: string; name: string }>;
  defaultFrom: string;
  defaultTo: string;
};

export function DashboardFilters({ categories, defaultFrom, defaultTo }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? defaultFrom);
  const [to, setTo] = useState(searchParams.get("to") ?? defaultTo);
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") ?? "");
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get("paymentMethod") ?? "");

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <section className="space-y-3 rounded-xl border border-ink-100 bg-white p-4">
      <DateRangePicker from={from} onFromChange={setFrom} onToChange={setTo} to={to} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Select onChange={(event) => setType(event.target.value)} value={type}>
          <option value="">Tipo: todos</option>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Egreso</option>
        </Select>
        <Select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
          <option value="">Categoría: todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
          <option value="">Método: todos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
        </Select>
        <Button onClick={applyFilters} type="button">
          Aplicar filtros
        </Button>
      </div>
    </section>
  );
}

