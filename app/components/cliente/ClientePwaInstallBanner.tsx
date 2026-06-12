"use client";

import { useEffect, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import {
  detectClientePwaDevice,
  type ClientePwaDevice,
} from "@/lib/cliente-pwa-device";
import type { ClienteUiCopy } from "@/lib/cliente-i18n";

type ClientePwaInstallBannerProps = {
  bodaId: string;
};

function getStorageKey(bodaId: string): string {
  return `celestia-cliente-pwa-banner:${bodaId}`;
}

function getPwaInstallMessage(
  device: ClientePwaDevice,
  t: ClienteUiCopy,
): string {
  if (device === "ios") return t.pwaInstallBannerIos;
  if (device === "android") return t.pwaInstallBannerAndroid;
  return t.pwaInstallBannerOther;
}

export function ClientePwaInstallBanner({ bodaId }: ClientePwaInstallBannerProps) {
  const { t } = useClienteLocale();
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<ClientePwaDevice>("other");

  useEffect(() => {
    setDevice(detectClientePwaDevice());

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
    <div className="border-b border-bloom-border/80 bg-gradient-to-br from-[#faf9f7] via-bloom-canvas to-[#f3ebe3] px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bloom-accent/20 bg-bloom-surface text-base shadow-sm"
            aria-hidden
          >
            📱
          </span>
          <p className="text-sm leading-relaxed text-bloom-ink">
            {getPwaInstallMessage(device, t)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 self-end rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-sm font-medium text-bloom-muted transition-colors hover:border-bloom-accent/30 hover:text-bloom-ink sm:self-start"
        >
          {t.pwaInstallBannerDismiss}
        </button>
      </div>
    </div>
  );
}
