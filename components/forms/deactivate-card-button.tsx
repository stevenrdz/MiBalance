"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeactivateCardButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDeactivate = async () => {
    if (!confirm("¿Desactivar tarjeta?")) return;
    setLoading(true);
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    setLoading(false);
    router.push("/cards");
    router.refresh();
  };

  return (
    <Button isLoading={loading} onClick={onDeactivate} size="sm" type="button" variant="danger">
      Desactivar
    </Button>
  );
}

