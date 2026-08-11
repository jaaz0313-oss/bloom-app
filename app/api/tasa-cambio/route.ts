import { NextResponse } from "next/server";
import { getTasaCambioCopPorUsd } from "@/lib/tasa-cambio";

/** Tasa COP por 1 USD del día, cacheada 1 hora. */
export async function GET() {
  try {
    const tasa = await getTasaCambioCopPorUsd();
    if (!tasa) {
      return NextResponse.json(
        { error: "No se pudo obtener la tasa de cambio." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        copPorUsd: tasa.copPorUsd,
        date: tasa.date,
        cached: tasa.cached,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener la tasa de cambio.",
      },
      { status: 500 },
    );
  }
}
