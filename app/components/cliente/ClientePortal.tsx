"use client";

import type { ReactNode } from "react";
import { ClienteLocaleProvider } from "@/app/components/cliente/ClienteLocaleProvider";
import { ClienteUsdPreferenceProvider } from "@/app/components/cliente/ClienteUsdPreferenceProvider";

export function ClientePortal({ children }: { children: ReactNode }) {
  return (
    <ClienteLocaleProvider>
      <ClienteUsdPreferenceProvider>{children}</ClienteUsdPreferenceProvider>
    </ClienteLocaleProvider>
  );
}
