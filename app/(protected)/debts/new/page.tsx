import { DebtForm } from "@/components/forms/debt-form";
import { Card } from "@/components/ui/card";

export default function NewDebtPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Nueva deuda</h1>
        <p className="text-sm text-ink-600">
          Registra un préstamo o avance en efectivo y controla sus pagos.
        </p>
      </div>
      <Card>
        <DebtForm mode="create" />
      </Card>
    </section>
  );
}

