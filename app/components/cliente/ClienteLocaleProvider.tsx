"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CLIENTE_DEFAULT_LOCALE,
  getClienteUiCopy,
  type ClienteLocale,
  type ClienteUiCopy,
} from "@/lib/cliente-i18n";

type ClienteLocaleContextValue = {
  locale: ClienteLocale;
  setLocale: (locale: ClienteLocale) => void;
  t: ClienteUiCopy;
};

const ClienteLocaleContext = createContext<ClienteLocaleContextValue | null>(
  null,
);

export function ClienteLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<ClienteLocale>(CLIENTE_DEFAULT_LOCALE);

  const setLocaleStable = useCallback((next: ClienteLocale) => {
    setLocale(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleStable,
      t: getClienteUiCopy(locale),
    }),
    [locale, setLocaleStable],
  );

  return (
    <ClienteLocaleContext.Provider value={value}>
      {children}
    </ClienteLocaleContext.Provider>
  );
}

export function useClienteLocale(): ClienteLocaleContextValue {
  const context = useContext(ClienteLocaleContext);
  if (!context) {
    throw new Error("useClienteLocale must be used within ClienteLocaleProvider");
  }
  return context;
}
