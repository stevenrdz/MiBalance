import { ForgotForm } from "@/components/forms/forgot-form";

export default function ForgotPage() {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">Recuperar contraseña</h2>
      <p className="mt-1 text-sm text-ink-600">
        Te enviaremos un enlace para restablecer el acceso.
      </p>
      <div className="mt-6">
        <ForgotForm />
      </div>
    </section>
  );
}

