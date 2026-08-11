import { buildPagosConAnticipo, type PagoRow } from "@/app/data/pagos";
import {
  dedupeProveedoresPorGrupo,
  getDepositoReembolsableMonto,
  getProveedorGrupoCategorias,
  getProviderSaldoPendienteConPagos,
  hasDepositoReembolsable,
  hasProveedorValorDefinido,
  type ProveedorRow,
} from "@/app/data/providers";
import { formatCurrency, formatShortDateStable } from "@/lib/format";

export const CLIENTE_VALOR_POR_DEFINIR = "Por definir";

export type ProjectionTableRow = {
  cells: [string, string, string, string, string];
  rowType: "valor" | "pago" | "sin-pagos" | "saldo" | "deposito" | "spacer";
  /** Monto en COP para columnas USD opcionales (Excel). */
  amountCop?: number | null;
};

function formatPagoConcepto(concepto: string | null): string {
  const trimmed = concepto?.trim();
  return trimmed || "Pago";
}

export function buildProviderTableRows(
  provider: ProveedorRow,
  pagos: PagoRow[],
  categoriaLabel: string,
): ProjectionTableRow[] {
  const rows: ProjectionTableRow[] = [];
  const valorDefinido = hasProveedorValorDefinido(provider.valor_total);
  const pagosHistorial = [...buildPagosConAnticipo(provider, pagos)].sort(
    (a, b) => a.fecha_pago.localeCompare(b.fecha_pago),
  );
  const saldo = getProviderSaldoPendienteConPagos(provider, pagos);

  rows.push({
    rowType: "valor",
    amountCop: valorDefinido ? Number(provider.valor_total) : null,
    cells: [
      categoriaLabel,
      provider.nombre,
      "Valor total",
      valorDefinido
        ? formatCurrency(provider.valor_total)
        : CLIENTE_VALOR_POR_DEFINIR,
      "",
    ],
  });

  if (pagosHistorial.length === 0) {
    rows.push({
      rowType: "sin-pagos",
      amountCop: null,
      cells: ["", "", "Sin pagos registrados", "—", "—"],
    });
  } else {
    for (const pago of pagosHistorial) {
      const monto = Number(pago.monto);
      rows.push({
        rowType: "pago",
        amountCop: Number.isFinite(monto) ? monto : null,
        cells: [
          "",
          "",
          formatPagoConcepto(pago.concepto),
          formatCurrency(monto),
          formatShortDateStable(pago.fecha_pago),
        ],
      });
    }
  }

  rows.push({
    rowType: "saldo",
    amountCop: valorDefinido ? saldo : null,
    cells: [
      "",
      "",
      "Saldo pendiente",
      valorDefinido ? formatCurrency(saldo) : CLIENTE_VALOR_POR_DEFINIR,
      "",
    ],
  });

  if (hasDepositoReembolsable(provider)) {
    const montoDeposito = getDepositoReembolsableMonto(provider);

    rows.push({
      rowType: "deposito",
      amountCop: montoDeposito,
      cells: [
        "",
        "",
        "Depósito reembolsable",
        formatCurrency(montoDeposito),
        "",
      ],
    });
  }

  rows.push({
    rowType: "spacer",
    amountCop: null,
    cells: ["", "", "", "", ""],
  });

  return rows;
}

export function buildProjectionTableBody(
  proveedores: ProveedorRow[],
  pagosByProveedor: Record<string, PagoRow[]>,
): ProjectionTableRow[] {
  return dedupeProveedoresPorGrupo(proveedores).flatMap((provider) =>
    buildProviderTableRows(
      provider,
      pagosByProveedor[provider.id] ?? [],
      getProveedorGrupoCategorias(proveedores, provider).join(", "),
    ),
  );
}
