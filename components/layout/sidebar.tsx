import Link from "next/link";
import { LayoutDashboard, WalletCards, HandCoins, CreditCard, Settings } from "lucide-react";
import { COMPANY_NAME } from "@/lib/constants";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Movimientos", icon: WalletCards },
  { href: "/cards", label: "Tarjetas", icon: CreditCard },
  { href: "/debts", label: "Deudas", icon: HandCoins },
  { href: "/settings/profile", label: "Configuración", icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-100 bg-white/90 p-4 backdrop-blur md:block">
      <div className="rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 p-4 text-white">
        <p className="text-xs uppercase tracking-wide text-brand-50">PangoTech</p>
        <h1 className="mt-1 text-lg font-bold">MiBalance EC</h1>
        <p className="mt-1 text-xs text-brand-100">Finanzas personales Ecuador</p>
      </div>
      <nav className="mt-6 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-8 text-xs text-ink-500">{COMPANY_NAME}</p>
    </aside>
  );
}

