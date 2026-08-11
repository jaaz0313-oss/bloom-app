import type { Metadata, Viewport } from "next";
import { ClientePortal } from "@/app/components/cliente/ClientePortal";
import {
  CLIENTE_PWA_NAME,
  CLIENTE_PWA_THEME_COLOR,
} from "@/lib/cliente-pwa-manifest";

export const metadata: Metadata = {
  title: "Bloom by Celestia",
  description:
    "Resumen de proveedores contratados y pagos pendientes para tu boda.",
  manifest: "/manifest.json",
  applicationName: CLIENTE_PWA_NAME,
  appleWebApp: {
    capable: true,
    title: CLIENTE_PWA_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: CLIENTE_PWA_THEME_COLOR,
  colorScheme: "light",
};

export default function ClienteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-full font-sans antialiased">
      <ClientePortal>{children}</ClientePortal>
    </div>
  );
}
