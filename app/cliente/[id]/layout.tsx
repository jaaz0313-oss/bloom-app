import type { Metadata, Viewport } from "next";
import {
  CLIENTE_PWA_NAME,
  CLIENTE_PWA_THEME_COLOR,
} from "@/lib/cliente-pwa-manifest";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { id } = await params;

  return {
    manifest: `/cliente/${id}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: CLIENTE_PWA_NAME,
      statusBarStyle: "default",
    },
    icons: {
      apple: "/logo.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: CLIENTE_PWA_THEME_COLOR,
};

export default function ClienteBodaLayout({ children }: LayoutProps) {
  return children;
}
