import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">Crear cuenta</h2>
      <p className="mt-1 text-sm text-ink-600">Empieza a registrar tus finanzas en USD.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </section>
  );
}

