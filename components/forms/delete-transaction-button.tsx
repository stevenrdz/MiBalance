"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
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
    <Button
      aria-label="Eliminar movimiento"
      className="h-8 w-8 p-0"
      isLoading={loading}
      size="sm"
      title="Eliminar"
      type="button"
      variant="ghost"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Eliminar</span>
    </Button>
  );
}
