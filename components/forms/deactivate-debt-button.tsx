"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeactivateDebtButton({ debtId }: { debtId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDeactivate = async () => {
    if (!confirm("¿Desactivar deuda?")) return;
    setLoading(true);
    await fetch(`/api/debts/${debtId}`, { method: "DELETE" });
    setLoading(false);
    router.push("/debts");
    router.refresh();
  };

  return (
    <Button isLoading={loading} onClick={onDeactivate} size="sm" type="button" variant="danger">
      Desactivar
    </Button>
  );
}

