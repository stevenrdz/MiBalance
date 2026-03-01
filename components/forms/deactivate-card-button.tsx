"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeactivateCardButton({
  cardId,
  isActive
}: {
  cardId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onToggle = async () => {
    const nextState = !isActive;
    if (!confirm(nextState ? "¿Reactivar tarjeta?" : "¿Desactivar tarjeta?")) return;
    setLoading(true);
    await fetch(`/api/cards/${cardId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ is_active: nextState })
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button isLoading={loading} onClick={onToggle} size="sm" type="button" variant="secondary">
      {isActive ? "Desactivar" : "Reactivar"}
    </Button>
  );
}
