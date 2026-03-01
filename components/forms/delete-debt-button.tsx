"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteDebtButton({ debtId }: { debtId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm("¿Eliminar deuda? Esta acción la ocultará del historial visible.")) return;
    setLoading(true);
    await fetch(`/api/debts/${debtId}`, { method: "DELETE" });
    setLoading(false);
    router.push("/debts");
    router.refresh();
  };

  return (
    <Button isLoading={loading} onClick={onDelete} size="sm" type="button" variant="danger">
      Eliminar
    </Button>
  );
}
