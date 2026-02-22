import { ResetForm } from "@/components/forms/reset-form";

export default function ResetPage() {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">Nueva contraseña</h2>
      <p className="mt-1 text-sm text-ink-600">
        Define una contraseña segura para tu cuenta.
      </p>
      <div className="mt-6">
        <ResetForm />
      </div>
    </section>
  );
}

