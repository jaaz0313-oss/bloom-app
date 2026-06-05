import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { ClientePortal } from "@/app/components/cliente/ClientePortal";

export const metadata: Metadata = {
  title: "Bloom by Celestia",
  description:
    "Resumen de proveedores contratados y pagos pendientes para tu boda.",
};

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export default function ClienteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${cormorant.variable} min-h-full font-sans antialiased`}>
      <ClientePortal>{children}</ClientePortal>
    </div>
  );
}
