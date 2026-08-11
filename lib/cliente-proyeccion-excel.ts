import "server-only";

import * as XLSX from "xlsx";
import {
  dedupeProveedoresPorGrupo,
  getProveedorGrupoCategorias,
} from "@/app/data/providers";
import type { ClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import { buildProjectionTableBody } from "@/lib/cliente-proyeccion-table";
import { formatCurrency, formatWeddingDate } from "@/lib/format";
import { formatUsdAmount, copToUsd } from "@/lib/tasa-cambio";

export type ClienteProyeccionExcelOptions = {
  includeUsd?: boolean;
  copPorUsd?: number | null;
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function buildClienteProyeccionExcelFilename(nombrePareja: string): string {
  const slug = sanitizeFilename(nombrePareja) || "boda";
  return `Proyeccion-${slug}.xlsx`;
}

function formatUsdCell(
  amountCop: number | null | undefined,
  copPorUsd: number | null | undefined,
): string {
  const usd = amountCop == null ? null : copToUsd(amountCop, copPorUsd);
  if (usd == null) return "";
  return `USD ${formatUsdAmount(usd)}`;
}

export function generateClienteProyeccionExcel(
  context: ClienteProyeccionContext,
  options: ClienteProyeccionExcelOptions = {},
): Uint8Array {
  const includeUsd = Boolean(options.includeUsd && options.copPorUsd);
  const copPorUsd = options.copPorUsd ?? null;

  const {
    boda,
    proveedores,
    proveedoresSinCosto,
    pagosByProveedor,
    totalContratado,
    totalPagado,
    saldoPendiente,
  } = context;

  const header = includeUsd
    ? ["Categoría", "Proveedor", "Concepto", "Monto", "USD", "Fecha"]
    : ["Categoría", "Proveedor", "Concepto", "Monto", "Fecha"];

  const sheetRows: (string | number)[][] = [
    ["Proyección de Inversión"],
    [boda.nombre_pareja],
    [
      [formatWeddingDate(boda.fecha_boda), boda.ciudad]
        .filter(Boolean)
        .join("  ·  "),
    ],
    [],
    header,
  ];

  const emptyDataRow = includeUsd
    ? ["", "", "", "", "", ""]
    : ["", "", "", "", ""];

  if (proveedores.length > 0) {
    const tableRows = buildProjectionTableBody(proveedores, pagosByProveedor);
    for (const row of tableRows) {
      if (row.rowType === "spacer") {
        sheetRows.push([...emptyDataRow]);
        continue;
      }

      const [categoria, proveedor, concepto, monto, fecha] = row.cells;
      if (includeUsd) {
        sheetRows.push([
          categoria,
          proveedor,
          concepto,
          monto,
          formatUsdCell(row.amountCop, copPorUsd),
          fecha,
        ]);
      } else {
        sheetRows.push([categoria, proveedor, concepto, monto, fecha]);
      }
    }

    sheetRows.push([]);
    if (includeUsd) {
      sheetRows.push([
        "Total contratado",
        "",
        "",
        formatCurrency(totalContratado),
        formatUsdCell(totalContratado, copPorUsd),
        "",
      ]);
      sheetRows.push([
        "Total pagado",
        "",
        "",
        formatCurrency(totalPagado),
        formatUsdCell(totalPagado, copPorUsd),
        "",
      ]);
      sheetRows.push([
        "Saldo total",
        "",
        "",
        formatCurrency(saldoPendiente),
        formatUsdCell(saldoPendiente, copPorUsd),
        "",
      ]);
    } else {
      sheetRows.push([
        "Total contratado",
        "",
        "",
        formatCurrency(totalContratado),
        "",
      ]);
      sheetRows.push([
        "Total pagado",
        "",
        "",
        formatCurrency(totalPagado),
        "",
      ]);
      sheetRows.push([
        "Saldo total",
        "",
        "",
        formatCurrency(saldoPendiente),
        "",
      ]);
    }
  }

  if (proveedoresSinCosto.length > 0) {
    sheetRows.push([]);
    sheetRows.push(["Servicios sin costo / regalos"]);
    sheetRows.push(["Categoría", "Proveedor", "Nota"]);
    for (const provider of dedupeProveedoresPorGrupo(proveedoresSinCosto)) {
      sheetRows.push([
        getProveedorGrupoCategorias(proveedoresSinCosto, provider).join(", "),
        provider.nombre,
        "Sin costo",
      ]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = includeUsd
    ? [
        { wch: 22 },
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
      ]
    : [
        { wch: 22 },
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 14 },
      ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proyección");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;
  return new Uint8Array(buffer);
}
