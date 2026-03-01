"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DeactivateDebtButton({
  debtId,
  isActive
}: {
  debtId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const onToggle = async () => {
    const nextState = !isActive;
    if (!confirm(nextState ? "¿Reactivar deuda?" : "¿Desactivar deuda?")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/debts/${debtId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: nextState })
      });

      const json = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(json?.error ?? "No se pudo actualizar el estado de la deuda.");
      }

      toast.success(nextState ? "Deuda reactivada." : "Deuda desactivada.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button isLoading={loading} onClick={onToggle} size="sm" type="button" variant="secondary">
      {isActive ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
