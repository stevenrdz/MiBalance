import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-ink-900">Página no encontrada</h1>
        <p className="mt-3 text-sm text-ink-600">
          El recurso solicitado no existe o fue movido.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          href="/dashboard"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}

