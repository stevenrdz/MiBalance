import { SignOutButton } from "@/components/layout/sign-out-button";

type TopbarProps = {
  email?: string | null;
};

export function Topbar({ email }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-800 md:text-base">MiBalance EC</h2>
          <p className="text-xs text-ink-500">{email ?? "Usuario"}</p>
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}

