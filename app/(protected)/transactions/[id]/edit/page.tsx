import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/forms/transaction-form";
import { Card } from "@/components/ui/card";
import { getCards, getCategories, getTransactionById } from "@/lib/data/queries";

type EditTransactionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
  const { id } = await params;
  const [transaction, categories, cards] = await Promise.all([
    getTransactionById(id),
    getCategories(),
    getCards(true)
  ]);

  if (!transaction) notFound();

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Editar movimiento</h1>
        <p className="text-sm text-ink-600">Actualiza datos y adjuntos del registro.</p>
      </div>

      <Card>
        <TransactionForm
          cards={cards}
          categories={categories}
          existingAttachments={transaction.attachments ?? []}
          initialData={{
            date: transaction.date,
            type: transaction.type,
            amount: Number(transaction.amount),
            category_id: transaction.category_id,
            payment_method: transaction.payment_method,
            card_id: transaction.card_id ?? null,
            merchant: transaction.merchant ?? "",
            description: transaction.description ?? ""
          }}
          mode="edit"
          transactionId={id}
        />
      </Card>
    </section>
  );
}

