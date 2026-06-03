import "server-only";

import * as XLSX from "xlsx";
import type { BodaRow } from "@/app/data/weddings";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { LeadRow } from "@/app/data/leads";
import type { PagoRow } from "@/app/data/pagos";
import {
  computePaymentProjection,
  getProviderSaldoPendienteConPagos,
  PROVIDER_STATUS_LABELS,
  type ProveedorRow,
} from "@/app/data/providers";
import { LEAD_SEGUIMIENTO_LABELS } from "@/app/data/leads";
import { groupPagosByProveedor } from "@/app/data/pagos";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { formatShortDateStable } from "@/lib/format";

type ProveedorWithBoda = ProveedorRow & {
  bodas: { nombre_pareja: string } | { nombre_pareja: string }[] | null;
};

function getBodaNombre(
  bodas: ProveedorWithBoda["bodas"],
): string {
  if (!bodas) return "";
  if (Array.isArray(bodas)) return bodas[0]?.nombre_pareja ?? "";
  return bodas.nombre_pareja ?? "";
}

function sheetFromRows(headers: string[], rows: (string | number)[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function buildAdminExportWorkbook(): Promise<Buffer> {
  const supabase = await createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = addDaysIso(30);

  const { data: bodasData } = await supabase
    .from("bodas")
    .select("*")
    .order("fecha_boda", { ascending: true });

  const { data: proveedoresData } = await supabase
    .from("proveedores")
    .select("*, bodas(nombre_pareja)");

  const { data: pagosData } = await supabase.from("pagos").select("*");

  const { data: directorioData } = await supabase
    .from("directorio_proveedores")
    .select("*")
    .order("nombre", { ascending: true });

  const { data: leadsData } = await supabase
    .from("leads")
    .select("*")
    .eq("estado", "activo")
    .order("created_at", { ascending: false });

  const bodas = (bodasData ?? []) as BodaRow[];
  const proveedores = ((proveedoresData ?? []) as ProveedorWithBoda[]).sort(
    (a, b) => {
      const bodaCmp = getBodaNombre(a.bodas).localeCompare(
        getBodaNombre(b.bodas),
        "es",
      );
      if (bodaCmp !== 0) return bodaCmp;
      return a.nombre.localeCompare(b.nombre, "es");
    },
  );
  const pagos = (pagosData ?? []) as PagoRow[];
  const pagosByProveedor = groupPagosByProveedor(pagos);

  const proveedoresByBoda = proveedores.reduce<Record<string, ProveedorRow[]>>(
    (acc, p) => {
      const list = acc[p.boda_id] ?? [];
      list.push(p);
      acc[p.boda_id] = list;
      return acc;
    },
    {},
  );

  const bodasRows: (string | number)[][] = bodas.map((boda) => {
    const bodaProveedores = proveedoresByBoda[boda.id] ?? [];
    const { totalContratado, totalPagado, saldoPendiente } =
      computePaymentProjection(bodaProveedores, pagosByProveedor);
    const contratados = bodaProveedores.filter((p) => p.estado === "contratado").length;

    return [
      boda.nombre_pareja,
      formatShortDateStable(boda.fecha_boda),
      boda.ciudad,
      totalContratado,
      totalPagado,
      saldoPendiente,
      contratados,
    ];
  });

  const proveedoresRows: (string | number)[][] = proveedores.map((p) => {
    const pagosProveedor = pagosByProveedor[p.id] ?? [];
    return [
      getBodaNombre(p.bodas),
      p.nombre,
      p.categoria,
      PROVIDER_STATUS_LABELS[p.estado],
      p.valor_total,
      p.anticipo,
      getProviderSaldoPendienteConPagos(p, pagosProveedor),
      p.fecha_saldo ? formatShortDateStable(p.fecha_saldo) : "",
      p.banco ?? "",
      p.numero_cuenta ?? "",
      p.titular_cuenta ?? "",
    ];
  });

  const pagosProximosRows: (string | number)[][] = [];
  for (const p of proveedores) {
    if (!p.fecha_saldo) continue;
    if (p.fecha_saldo < today || p.fecha_saldo > maxDate) continue;

    const pagosProveedor = pagosByProveedor[p.id] ?? [];
    const saldo = getProviderSaldoPendienteConPagos(p, pagosProveedor);
    if (saldo <= 0) continue;

    pagosProximosRows.push([
      getBodaNombre(p.bodas),
      p.nombre,
      p.categoria,
      saldo,
      formatShortDateStable(p.fecha_saldo),
      p.banco ?? "",
      p.numero_cuenta ?? "",
      p.titular_cuenta ?? "",
    ]);
  }

  pagosProximosRows.sort((a, b) =>
    String(a[4]).localeCompare(String(b[4])),
  );

  const directorio = (directorioData ?? []) as DirectorioProveedorRow[];
  const directorioRows: (string | number)[][] = directorio.map((d) => [
    d.nombre,
    d.categoria,
    d.ciudad_base ?? "",
    d.nombre_contacto ?? "",
    d.telefono ?? "",
    d.email ?? "",
    d.banco ?? "",
    d.tipo_cuenta ?? "",
    d.numero_cuenta ?? "",
    d.titular ?? "",
    d.documento_nit ?? "",
  ]);

  const leads = (leadsData ?? []) as LeadRow[];
  const leadsRows: (string | number)[][] = leads.map((l) => [
    l.nombre_pareja,
    l.telefono ?? "",
    l.email ?? "",
    l.fecha_tentativa ? formatShortDateStable(l.fecha_tentativa) : "",
    l.ciudad,
    l.cantidad_invitados ?? "",
    l.presupuesto_estimado ?? "",
    LEAD_SEGUIMIENTO_LABELS[l.estado_seguimiento],
  ]);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        "Nombre pareja",
        "Fecha boda",
        "Ciudad",
        "Total contratado",
        "Total pagado",
        "Saldo pendiente",
        "Número de proveedores contratados",
      ],
      bodasRows,
    ),
    "Bodas activas",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        "Boda",
        "Proveedor",
        "Categoría",
        "Estado",
        "Valor total",
        "Anticipo",
        "Saldo pendiente",
        "Fecha pago saldo",
        "Banco",
        "Número cuenta",
        "Titular",
      ],
      proveedoresRows,
    ),
    "Proveedores por boda",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        "Boda",
        "Proveedor",
        "Categoría",
        "Saldo pendiente",
        "Fecha límite",
        "Banco",
        "Número cuenta",
        "Titular",
      ],
      pagosProximosRows,
    ),
    "Pagos próximos 30 días",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        "Nombre",
        "Categoría",
        "Ciudad base",
        "Contacto",
        "Teléfono",
        "Email",
        "Banco",
        "Tipo cuenta",
        "Número cuenta",
        "Titular",
        "Documento NIT",
      ],
      directorioRows,
    ),
    "Directorio proveedores",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFromRows(
      [
        "Nombre pareja",
        "Teléfono",
        "Email",
        "Fecha estimada",
        "Ciudad",
        "Invitados",
        "Presupuesto",
        "Estado seguimiento",
      ],
      leadsRows,
    ),
    "Leads activos",
  );

  const arrayBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return arrayBuffer;
}

export function buildAdminExportFilename(): string {
  return `Celestia_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
}
