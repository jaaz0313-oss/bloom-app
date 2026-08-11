"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "bloom-cliente-show-usd";

type ClienteUsdPreferenceContextValue = {
  showUsd: boolean;
  setShowUsd: (value: boolean) => void;
  toggleShowUsd: () => void;
};

const ClienteUsdPreferenceContext =
  createContext<ClienteUsdPreferenceContextValue | null>(null);

export function ClienteUsdPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [showUsd, setShowUsdState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setShowUsdState(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* localStorage no disponible */
    }
    setHydrated(true);
  }, []);

  const setShowUsd = useCallback((value: boolean) => {
    setShowUsdState(value);
  }, []);

  const toggleShowUsd = useCallback(() => {
    setShowUsdState((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, showUsd ? "1" : "0");
    } catch {
      /* localStorage no disponible */
    }
  }, [hydrated, showUsd]);

  const value = useMemo(
    () => ({
      showUsd,
      setShowUsd,
      toggleShowUsd,
    }),
    [showUsd, setShowUsd, toggleShowUsd],
  );

  return (
    <ClienteUsdPreferenceContext.Provider value={value}>
      {children}
    </ClienteUsdPreferenceContext.Provider>
  );
}

export function useClienteUsdPreference(): ClienteUsdPreferenceContextValue {
  const context = useContext(ClienteUsdPreferenceContext);
  if (!context) {
    throw new Error(
      "useClienteUsdPreference must be used within ClienteUsdPreferenceProvider",
    );
  }
  return context;
}

/** Tasa efectiva según el toggle "Ver en USD". */
export function useClienteEffectiveCopPorUsd(
  copPorUsd: number | null | undefined,
): number | null {
  const { showUsd } = useClienteUsdPreference();
  if (!showUsd) return null;
  return copPorUsd ?? null;
}
