const EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD";
const CACHE_TTL_MS = 60 * 60 * 1000;

type TasaCambioCache = {
  copPorUsd: number;
  fetchedAt: number;
  date: string | null;
};

let cache: TasaCambioCache | null = null;

export type TasaCambioResult = {
  /** COP por 1 USD (ej. 4200). */
  copPorUsd: number;
  date: string | null;
  cached: boolean;
};

type ExchangeRateApiResponse = {
  date?: string;
  rates?: {
    COP?: number;
  };
};

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Obtiene COP por USD, con cache en memoria de 1 hora. */
export async function getTasaCambioCopPorUsd(): Promise<TasaCambioResult | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return {
      copPorUsd: cache.copPorUsd,
      date: cache.date,
      cached: true,
    };
  }

  try {
    const response = await fetch(EXCHANGE_RATE_URL, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Exchange rate API responded with ${response.status}`);
    }

    const payload = (await response.json()) as ExchangeRateApiResponse;
    const copPorUsd = payload.rates?.COP;
    if (!isValidRate(copPorUsd)) {
      throw new Error("Invalid COP rate in exchange API response");
    }

    cache = {
      copPorUsd,
      fetchedAt: now,
      date: payload.date?.trim() || null,
    };

    return {
      copPorUsd,
      date: cache.date,
      cached: false,
    };
  } catch (error) {
    console.error("[tasa-cambio]", error);
    if (cache) {
      return {
        copPorUsd: cache.copPorUsd,
        date: cache.date,
        cached: true,
      };
    }
    return null;
  }
}

export function copToUsd(
  amountCop: number,
  copPorUsd: number | null | undefined,
): number | null {
  if (
    copPorUsd == null ||
    !Number.isFinite(copPorUsd) ||
    copPorUsd <= 0 ||
    !Number.isFinite(amountCop)
  ) {
    return null;
  }
  return amountCop / copPorUsd;
}

export function formatUsdAmount(amountUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amountUsd));
}

/** Ej: `(≈ USD 4,500)` */
export function formatUsdApprox(
  amountCop: number,
  copPorUsd: number | null | undefined,
): string | null {
  const usd = copToUsd(amountCop, copPorUsd);
  if (usd == null) return null;
  return `(≈ USD ${formatUsdAmount(usd)})`;
}

/** Ej: `$ 18.000.000 (≈ USD 4,500)` — requiere `formatCurrency` del caller o import. */
export function appendUsdApprox(
  formattedCop: string,
  amountCop: number,
  copPorUsd: number | null | undefined,
): string {
  const usd = formatUsdApprox(amountCop, copPorUsd);
  return usd ? `${formattedCop} ${usd}` : formattedCop;
}
