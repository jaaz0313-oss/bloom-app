"use client";

import { ClienteLanguageToggle } from "@/app/components/cliente/ClienteLanguageToggle";
import { ClienteUsdToggle } from "@/app/components/cliente/ClienteUsdToggle";

export function ClienteHeaderControls() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ClienteUsdToggle />
      <ClienteLanguageToggle />
    </div>
  );
}
