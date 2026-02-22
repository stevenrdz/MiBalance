import Link from "next/link";
import { LayoutDashboard, WalletCards, CreditCard, HandCoins } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/transactions", label: "Movs", icon: WalletCards },
  { href: "/cards", label: "Tarjetas", icon: CreditCard },
  { href: "/debts", label: "Deudas", icon: HandCoins }
];

export function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-100 bg-white md:hidden">
      <nav className="grid grid-cols-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              className="flex flex-col items-center gap-1 py-2 text-xs text-ink-600 hover:bg-ink-100"
              href={link.href}
              key={link.href}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

