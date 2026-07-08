"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import { verifyClientePin, extractPhoneDigits } from "@/lib/cliente-pin";

type ClienteDetallesPinModalProps = {
  open: boolean;
  telefonoNovia: string | null | undefined;
  onClose: () => void;
  onSuccess: (pin: string) => void;
};

export function ClienteDetallesPinModal({
  open,
  telefonoNovia,
  onClose,
  onSuccess,
}: ClienteDetallesPinModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useClienteLocale();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setError(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (verifyClientePin(pin, telefonoNovia)) {
      setError(null);
      onSuccess(extractPhoneDigits(pin));
      return;
    }

    setError(t.detallesCelebracionPinError);
    setPin("");
    inputRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
        <h2 id={titleId} className="font-display text-xl text-bloom-ink">
          {t.detallesCelebracionPinTitle}
        </h2>
        <p className="mt-2 text-sm text-bloom-muted">
          {t.detallesCelebracionPinPrompt}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, "").slice(0, 3));
              setError(null);
            }}
            className="w-full rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-bloom-ink outline-none transition-colors focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20"
            aria-label={t.detallesCelebracionPinPrompt}
            required
          />

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
            >
              {t.detallesCelebracionPinCancel}
            </button>
            <button
              type="submit"
              disabled={pin.length !== 3}
              className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {t.detallesCelebracionPinSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
