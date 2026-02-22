import { APP_NAME } from "@/lib/constants";

type AuthLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-soft">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-brand-700">PangoTech</p>
          <h1 className="text-2xl font-bold text-ink-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-ink-600">Finanzas personales para Ecuador</p>
        </div>
        {children}
      </div>
    </main>
  );
}

