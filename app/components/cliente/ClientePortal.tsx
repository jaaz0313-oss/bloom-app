"use client";

import type { ReactNode } from "react";
import { ClienteLocaleProvider } from "@/app/components/cliente/ClienteLocaleProvider";

export function ClientePortal({ children }: { children: ReactNode }) {
  return <ClienteLocaleProvider>{children}</ClienteLocaleProvider>;
}
