"use client";

import { useEffect, useState } from "react";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { buildGmailComposeUrl } from "@/lib/gmail-compose";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";

type EmailShareModalProps = {
  open: boolean;
  onClose: () => void;
  recipientEmail: string;
  subject: string;
  initialMessage: string;
  instructions: string;
};

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-surface px-3 py-2.5 text-sm leading-relaxed text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20 min-h-[200px]";

export function EmailShareModal({
  open,
  onClose,
  recipientEmail,
  subject,
  initialMessage,
  instructions,
}: EmailShareModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMessage(initialMessage);
      setCopyNotice(null);
      setCopyError(null);
    }
  }, [open, initialMessage]);

  function handleCopy() {
    setCopyError(null);
    setCopyNotice(null);
    const text = message.trim();
    if (!text) {
      setCopyError("El mensaje está vacío.");
      return;
    }
    const copied = copyTextToClipboard(text);
    if (copied) {
      setCopyNotice("✓ Mensaje copiado al portapapeles");
      window.setTimeout(() => setCopyNotice(null), 3000);
    } else {
      setCopyError("No se pudo copiar el mensaje. Intenta seleccionarlo manualmente.");
    }
  }

  function handleOpenGmail() {
    const url = buildGmailComposeUrl(recipientEmail, subject);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Mensaje para enviar por email"
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-bloom-muted">
          Destinatario:{" "}
          <span className="font-medium text-bloom-ink">{recipientEmail}</span>
        </p>

        <textarea
          className={textareaClass}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          aria-label="Mensaje del email"
        />

        <p className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/60 px-4 py-3 text-sm text-bloom-muted">
          {instructions}
        </p>

        {copyNotice && (
          <p
            className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
            role="status"
          >
            {copyNotice}
          </p>
        )}

        {copyError && (
          <p
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
            role="alert"
          >
            {copyError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
          >
            Copiar mensaje
          </button>
          <button
            type="button"
            onClick={handleOpenGmail}
            className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
          >
            Abrir Gmail
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
