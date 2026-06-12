"use client";

import { useEffect, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";

type ClientePwaInstallBannerProps = {
  bodaId: string;
};

function getStorageKey(bodaId: string): string {
  return `celestia-cliente-pwa-banner:${bodaId}`;
}

export function ClientePwaInstallBanner({ bodaId }: ClientePwaInstallBannerProps) {
  const { t } = useClienteLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(getStorageKey(bodaId));
      if (!dismissed) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [bodaId]);

  function handleDismiss() {
    try {
      window.localStorage.setItem(getStorageKey(bodaId), "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="border-b border-bloom-border/80 bg-gradient-to-r from-[#faf9f7] to-bloom-canvas px-5 py-3 sm:px-8">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden>
          📱
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-bloom-ink">
            {t.pwaInstallBanner}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full px-3 py-1 text-sm font-medium text-bloom-muted transition-colors hover:bg-bloom-surface hover:text-bloom-ink"
          aria-label={t.pwaInstallBannerDismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
