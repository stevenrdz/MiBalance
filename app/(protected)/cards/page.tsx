import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { getCardsWithStats } from "@/lib/data/queries";
import { formatCurrency } from "@/lib/format";

export default async function CardsPage() {
  const cards = await getCardsWithStats();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Tarjetas</h1>
          <p className="text-sm text-ink-600">Administra tus tarjetas de crédito en USD.</p>
        </div>
        <Link
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          href="/cards/new"
        >
          Nueva tarjeta
        </Link>
      </div>

      {cards.length === 0 ? (
        <EmptyState message="Aún no tienes tarjetas registradas." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <p className="text-xs uppercase tracking-wide text-ink-500">
                {card.is_active ? "Activa" : "Inactiva"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">{card.name}</h2>
              <p className="mt-2 text-sm text-ink-600">Cupo: {formatCurrency(Number(card.credit_limit))}</p>
              <p className="text-sm text-ink-600">
                Corte: día {card.statement_day} | Pago: día {card.payment_day}
              </p>
              <Link
                className="mt-4 inline-flex rounded-md bg-ink-900 px-3 py-2 text-sm font-semibold text-white hover:bg-ink-800"
                href={`/cards/${card.id}`}
              >
                Ver detalle
              </Link>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

