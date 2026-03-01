"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteCardButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm("¿Eliminar tarjeta? Esta accion ocultara la tarjeta y su historial solo quedara en base.")) {
      return;
    }
    setLoading(true);
    await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    setLoading(false);
    router.push("/cards");
    router.refresh();
  };

  return (
    <Button isLoading={loading} onClick={onDelete} size="sm" type="button" variant="danger">
      Eliminar
    </Button>
  );
}
