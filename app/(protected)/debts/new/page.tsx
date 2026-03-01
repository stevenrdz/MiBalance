import { DebtOnboardingForm } from "@/components/forms/debt-onboarding-form";

export default function NewDebtPage() {
  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Nueva deuda</h1>
        <p className="text-sm text-ink-600">
          Elige el tipo, analiza el documento si lo tienes y confirma las letras o cuotas antes de guardar.
        </p>
      </div>
      <DebtOnboardingForm />
    </section>
  );
}
