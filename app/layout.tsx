import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiBalance EC | PangoTech",
  description:
    "MVP de finanzas personales para Ecuador con autenticación y gestión de ingresos, egresos, tarjetas y deudas."
};

type RootLayoutProps = Readonly<{ children: React.ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es-EC">
      <body>{children}</body>
    </html>
  );
}

