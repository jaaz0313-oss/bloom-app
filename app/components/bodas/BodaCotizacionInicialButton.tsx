"use client";

import { useState } from "react";

type BodaCotizacionInicialButtonProps = {
  leadId: string;
};

export function BodaCotizacionInicialButton({
  leadId,
}: BodaCotizacionInicialButtonProps) {
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);

    const url = `/api/leads/${leadId}/cotizacion-pdf`;
    const newTab = window.open(url, "_blank", "noopener,noreferrer");

    if (!newTab) {
      setError(
        "No se pudo abrir la cotización. Permite ventanas emergentes e intenta de nuevo.",
      );
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink shadow-sm transition-colors hover:bg-bloom-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
      >
        <OpenIcon />
        Cotización inicial
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function OpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.25 5.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-3.19l6.22 6.22a.75.75 0 1 1-1.06 1.06L5.25 7.56v3.19a.75.75 0 0 1-1.5 0v-4.5Z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M8.25 4.5a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0V6.31l-7.72 7.72a.75.75 0 1 1-1.06-1.06l7.72-7.72H9a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
