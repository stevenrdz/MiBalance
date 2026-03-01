import { Suspense } from "react";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink-900">Iniciar sesión</h2>
      <p className="mt-1 text-sm text-ink-600">Accede a tu panel de finanzas.</p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-ink-600">Cargando...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
