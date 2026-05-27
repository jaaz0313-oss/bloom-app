"use client";

import { useState } from "react";

type ShareWithClientButtonProps = {
  bodaId: string;
};

export function ShareWithClientButton({ bodaId }: ShareWithClientButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);

    const url = `${window.location.origin}/cliente/${bodaId}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("No se pudo copiar el enlace. Intenta de nuevo.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink shadow-sm transition-colors hover:bg-bloom-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
      >
        <ShareIcon />
        {copied ? "¡Link copiado!" : "Compartir con cliente"}
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M13.5 4.5a2.121 2.121 0 0 1 3 3L11.62 12.38a2.121 2.121 0 1 1-3-3L13.5 4.5Z" />
      <path d="M6.5 8.5a2.121 2.121 0 0 1 3 3L4.62 16.38a2.121 2.121 0 1 1-3-3L6.5 8.5Z" />
    </svg>
  );
}
