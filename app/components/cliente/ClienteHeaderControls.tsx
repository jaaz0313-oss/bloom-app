"use client";

import { ClienteLanguageToggle } from "@/app/components/cliente/ClienteLanguageToggle";

export function ClienteHeaderControls() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ClienteLanguageToggle />
    </div>
  );
}
