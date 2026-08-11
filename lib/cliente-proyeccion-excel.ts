import "server-only";

import * as XLSX from "xlsx";
import {
  dedupeProveedoresPorGrupo,
  getProveedorGrupoCategorias,
} from "@/app/data/providers";
import type { ClienteProyeccionContext } from "@/lib/cliente-proyeccion";
import { buildProjectionTableBody } from "@/lib/cliente-proyeccion-table";
import { formatCurrency, formatWeddingDate } from "@/lib/format";

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

export function generateClienteProyeccionExcel(
  context: ClienteProyeccionContext,
): Buffer {
  const {
    boda,
    proveedores,
    proveedoresSinCosto,
    pagosByProveedor,
    totalContratado,
    totalPagado,
    saldoPendiente,
  } = context;

  const sheetRows: (string | number)[][] = [
    ["Proyección de Inversión"],
    [boda.nombre_pareja],
    [
      [formatWeddingDate(boda.fecha_boda), boda.ciudad]
        .filter(Boolean)
        .join("  ·  "),
    ],
    [],
    ["Categoría", "Proveedor", "Concepto", "Monto", "Fecha"],
  ];

  if (proveedores.length > 0) {
    const tableRows = buildProjectionTableBody(proveedores, pagosByProveedor);
    for (const row of tableRows) {
      if (row.rowType === "spacer") {
        sheetRows.push(["", "", "", "", ""]);
        continue;
      }
      sheetRows.push([...row.cells]);
    }

    sheetRows.push([]);
    sheetRows.push(["Total contratado", "", "", formatCurrency(totalContratado), ""]);
    sheetRows.push(["Total pagado", "", "", formatCurrency(totalPagado), ""]);
    sheetRows.push(["Saldo total", "", "", formatCurrency(saldoPendiente), ""]);
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
  worksheet["!cols"] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Proyección");

  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer,
  );
}
