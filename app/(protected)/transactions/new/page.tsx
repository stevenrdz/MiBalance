import Link from "next/link";
import { TransactionForm } from "@/components/forms/transaction-form";
import { Card } from "@/components/ui/card";
import { getCards, getCategories } from "@/lib/data/queries";

type NewTransactionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewTransactionPage({ searchParams }: NewTransactionPageProps) {
  const params = await searchParams;
  const categories = await getCategories();
  const cards = await getCards();
  const forcedType = typeof params.type === "string" ? params.type : "EXPENSE";

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Nuevo movimiento</h1>
        <p className="text-sm text-ink-600">Registra ingresos o egresos con adjuntos.</p>
      </div>

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-700">
            Primero crea categorías para poder registrar movimientos.
          </p>
          <Link
            className="mt-3 inline-flex rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            href="/settings/categories"
          >
            Ir a categorías
          </Link>
        </Card>
      ) : (
        <Card>
          <TransactionForm
            cards={cards}
            categories={categories}
            initialData={{ type: forcedType === "INCOME" ? "INCOME" : "EXPENSE" }}
            mode="create"
          />
        </Card>
      )}
    </section>
  );
}

