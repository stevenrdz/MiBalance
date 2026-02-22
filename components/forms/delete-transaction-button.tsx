"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type DeleteTransactionButtonProps = {
  transactionId: string;
};

export function DeleteTransactionButton({ transactionId }: DeleteTransactionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este movimiento? Se hará soft delete.")) return;
    setLoading(true);
    const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
    setLoading(false);
    if (!response.ok) return;
    router.refresh();
  };

  return (
    <Button isLoading={loading} size="sm" type="button" variant="ghost" onClick={handleDelete}>
      Eliminar
    </Button>
  );
}

