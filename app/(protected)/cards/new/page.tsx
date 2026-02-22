import { CardForm } from "@/components/forms/card-form";
import { Card } from "@/components/ui/card";

export default function NewCardPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Nueva tarjeta</h1>
        <p className="text-sm text-ink-600">Registra una tarjeta con su ciclo de corte y pago.</p>
      </div>
      <Card>
        <CardForm mode="create" />
      </Card>
    </section>
  );
}

