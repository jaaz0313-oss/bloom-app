import {
  CITA_TIPO_LABELS,
  CITA_TIPOS,
  type CitaEstado,
  type CitaRow,
  type CitaTipo,
} from "@/app/data/citas";
import type { BodaRow } from "@/app/data/weddings";
import type { LeadRow } from "@/app/data/leads";
import { parseProveedorFromCitaTitulo } from "@/lib/cita-titulo";
import { formatLongDateStable } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { UserRole } from "@/lib/auth/roles";

export type CitaProveedorLookup = {
  nombre: string;
};

export type CitaWhatsAppLookupContext = {
  bodasById: Record<string, Pick<BodaRow, "nombre_pareja" | "telefono_novia" | "telefono_novio">>;
  leadsById: Record<string, Pick<LeadRow, "nombre_pareja">>;
  proveedoresById?: Record<string, CitaProveedorLookup>;
};

type CitaWhatsAppFields = Pick<
  CitaRow,
  | "tipo"
  | "titulo"
  | "proveedor_id"
  | "fecha"
  | "hora_inicio"
  | "hora_fin"
  | "lugar"
  | "link_meet"
  | "boda_id"
  | "lead_id"
>;

function formatCitaHoraTexto(horaInicio: string, horaFin?: string | null): string {
  const horaInicioFmt = formatTimeStable(horaInicio);
  return horaFin?.trim() ?
      `${horaInicioFmt} - ${formatTimeStable(horaFin)}`
    : horaInicioFmt;
}

/** Nombre del proveedor para reunion_proveedor (proveedor_id o título). */
export function getProveedorNombreForCita(
  cita: Pick<CitaRow, "tipo" | "titulo" | "proveedor_id">,
  proveedoresById?: Record<string, CitaProveedorLookup>,
): string | null {
  if (cita.tipo !== "reunion_proveedor") return null;

  if (cita.proveedor_id) {
    const fromDb = proveedoresById?.[cita.proveedor_id]?.nombre?.trim();
    if (fromDb) return fromDb;
  }

  const fromTitulo = parseProveedorFromCitaTitulo(cita.titulo);
  if (fromTitulo?.nombre?.trim()) return fromTitulo.nombre.trim();

  return null;
}

function buildCitaWhatsAppDetalleLines(params: {
  fecha: string;
  horaInicio: string;
  horaFin?: string | null;
  tipo: CitaTipo;
  proveedorNombre?: string | null;
  lugar?: string | null;
  linkMeet?: string | null;
}): string[] {
  const fechaNorm = normalizeCitaFecha(params.fecha);
  const lines = [
    `📅 ${formatLongDateStable(fechaNorm)}`,
    `🕐 ${formatCitaHoraTexto(params.horaInicio, params.horaFin)}`,
  ];

  if (params.tipo === "reunion_proveedor" && params.proveedorNombre?.trim()) {
    lines.push(`👤 Proveedor: ${params.proveedorNombre.trim()}`);
  }
  if (params.lugar?.trim()) {
    lines.push(`📍 ${params.lugar.trim()}`);
  }
  if (params.linkMeet?.trim()) {
    lines.push(`🔗 ${params.linkMeet.trim()}`);
  }

  return lines;
}

export function canCreateCitaTipo(role: UserRole, tipo: CitaTipo): boolean {
  if (tipo === "primera_reunion") {
    return role === "admin" || role === "lider";
  }
  return true;
}

export function getCitaTiposForRole(role: UserRole): CitaTipo[] {
  return CITA_TIPOS.filter((tipo) => canCreateCitaTipo(role, tipo));
}

/** Normaliza fecha de Postgres/Supabase (date o timestamptz) a YYYY-MM-DD. */
export function normalizeCitaFecha(fecha: string): string {
  if (!fecha) return "";
  const trimmed = String(fecha).trim();
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];
  const fromT = trimmed.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromT)) return fromT;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return fromT.slice(0, 10);
}

const CITA_ESTADOS = [
  "programada",
  "confirmada",
  "cancelada",
  "realizada",
] as const;

export function normalizeCitaEstado(estado: string | null | undefined): CitaRow["estado"] {
  if (estado && CITA_ESTADOS.includes(estado as (typeof CITA_ESTADOS)[number])) {
    return estado as CitaRow["estado"];
  }
  return "programada";
}

export function normalizeCitaRow<T extends CitaRow>(cita: T): T {
  return {
    ...cita,
    fecha: normalizeCitaFecha(cita.fecha),
    estado: normalizeCitaEstado(cita.estado),
  };
}

export function formatTimeStable(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "p. m." : "a. m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

export function formatCitaHorario(cita: Pick<CitaRow, "hora_inicio" | "hora_fin">): string {
  const inicio = formatTimeStable(cita.hora_inicio);
  if (!cita.hora_fin) return inicio;
  return `${inicio} – ${formatTimeStable(cita.hora_fin)}`;
}

export type ClienteCitaInfo = {
  nombre: string;
  telefono: string | null;
};

export function getClienteInfoForCita(
  cita: Pick<CitaRow, "boda_id" | "lead_id">,
  bodasById: Record<string, Pick<BodaRow, "nombre_pareja" | "telefono_novia" | "telefono_novio">>,
  leadsById: Record<string, Pick<LeadRow, "nombre_pareja">>,
): ClienteCitaInfo | null {
  if (cita.boda_id) {
    const boda = bodasById[cita.boda_id];
    if (!boda) return null;
    const telefono =
      boda.telefono_novia?.trim() || boda.telefono_novio?.trim() || null;
    return { nombre: boda.nombre_pareja, telefono };
  }
  if (cita.lead_id) {
    const lead = leadsById[cita.lead_id];
    if (!lead) return null;
    return { nombre: lead.nombre_pareja, telefono: null };
  }
  return null;
}

export function buildCitaConfirmacionWhatsAppMessage(params: {
  nombreCliente: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string | null;
  tipo?: CitaTipo;
  proveedorNombre?: string | null;
  lugar?: string | null;
  linkMeet?: string | null;
}): string {
  const { nombreCliente, fecha, horaInicio, horaFin, tipo, proveedorNombre, lugar, linkMeet } =
    params;

  const lines = [
    `Hola ${nombreCliente.trim()}, confirmamos tu cita con Celestia:`,
    ...buildCitaWhatsAppDetalleLines({
      fecha,
      horaInicio,
      horaFin,
      tipo: tipo ?? "reunion_seguimiento",
      proveedorNombre,
      lugar,
      linkMeet,
    }),
    "¡Te esperamos! Cualquier duda estamos atentos 🌸",
  ];

  return lines.join("\n");
}

export function buildCitaConfirmacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
): string | null {
  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  if (!cliente?.nombre?.trim()) return null;

  return buildCitaConfirmacionWhatsAppMessage({
    nombreCliente: cliente.nombre,
    fecha: cita.fecha,
    horaInicio: cita.hora_inicio,
    horaFin: cita.hora_fin,
    tipo: cita.tipo,
    proveedorNombre: getProveedorNombreForCita(cita, context.proveedoresById),
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
  });
}

export function getCitaWhatsAppUrl(
  telefono: string | null | undefined,
  message: string,
): string | null {
  if (!telefono?.trim()) return null;
  return buildWhatsAppUrl(telefono, message);
}

export function getCitaRelacionLabel(
  cita: Pick<CitaRow, "boda_id" | "lead_id">,
  bodasById: Record<string, { nombre_pareja: string }>,
  leadsById: Record<string, { nombre_pareja: string }>,
): string | null {
  if (cita.boda_id) {
    return bodasById[cita.boda_id]?.nombre_pareja ?? "Boda";
  }
  if (cita.lead_id) {
    return leadsById[cita.lead_id]?.nombre_pareja ?? "Lead";
  }
  return null;
}

export function sortCitasBySchedule<T extends Pick<CitaRow, "fecha" | "hora_inicio">>(
  citas: T[],
): T[] {
  return [...citas].sort((a, b) => {
    const dateCmp = a.fecha.localeCompare(b.fecha);
    if (dateCmp !== 0) return dateCmp;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });
}

export function getCitaTipoLabel(tipo: CitaTipo): string {
  return CITA_TIPO_LABELS[tipo];
}

export function buildCitaCancelacionWhatsAppMessage(params: {
  nombreCliente: string;
  fecha: string;
  horaInicio: string;
  tipo?: CitaTipo;
  proveedorNombre?: string | null;
}): string {
  const fechaNorm = normalizeCitaFecha(params.fecha);
  const horaFmt = formatTimeStable(params.horaInicio);
  const conProveedor =
    params.tipo === "reunion_proveedor" && params.proveedorNombre?.trim() ?
      ` con ${params.proveedorNombre.trim()}`
    : "";

  const lines = [
    `Hola ${params.nombreCliente.trim()}, lamentamos informarte que la cita${conProveedor} programada para el ${formatLongDateStable(fechaNorm)} a las ${horaFmt} ha sido cancelada.`,
  ];

  if (params.tipo === "reunion_proveedor" && params.proveedorNombre?.trim()) {
    lines.push(`👤 Proveedor: ${params.proveedorNombre.trim()}`);
  }

  lines.push(
    "Nos pondremos en contacto contigo pronto para reagendar. Disculpa los inconvenientes 🌸",
  );

  return lines.join("\n");
}

export function buildCitaCancelacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
): string | null {
  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  if (!cliente?.nombre?.trim()) return null;
  return buildCitaCancelacionWhatsAppMessage({
    nombreCliente: cliente.nombre,
    fecha: cita.fecha,
    horaInicio: cita.hora_inicio,
    tipo: cita.tipo,
    proveedorNombre: getProveedorNombreForCita(cita, context.proveedoresById),
  });
}

export function buildCitaModificacionWhatsAppMessage(params: {
  nombreCliente: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string | null;
  tipo?: CitaTipo;
  proveedorNombre?: string | null;
  lugar?: string | null;
  linkMeet?: string | null;
}): string {
  const { nombreCliente, fecha, horaInicio, horaFin, tipo, proveedorNombre, lugar, linkMeet } =
    params;

  const lines = [
    `Hola ${nombreCliente.trim()}, te confirmamos los cambios en tu cita con Celestia:`,
    ...buildCitaWhatsAppDetalleLines({
      fecha,
      horaInicio,
      horaFin,
      tipo: tipo ?? "reunion_seguimiento",
      proveedorNombre,
      lugar,
      linkMeet,
    }),
    "¡Te esperamos! Cualquier duda estamos atentos 🌸",
  ];

  return lines.join("\n");
}

export function buildCitaModificacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
): string | null {
  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  if (!cliente?.nombre?.trim()) return null;

  return buildCitaModificacionWhatsAppMessage({
    nombreCliente: cliente.nombre,
    fecha: cita.fecha,
    horaInicio: cita.hora_inicio,
    horaFin: cita.hora_fin,
    tipo: cita.tipo,
    proveedorNombre: getProveedorNombreForCita(cita, context.proveedoresById),
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
  });
}

export type CitaScheduleSnapshot = {
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  lugar: string | null;
  link_meet: string | null;
};

export function getCitaScheduleSnapshot(
  cita: Pick<CitaRow, "fecha" | "hora_inicio" | "hora_fin" | "lugar" | "link_meet">,
): CitaScheduleSnapshot {
  return {
    fecha: normalizeCitaFecha(cita.fecha),
    hora_inicio: cita.hora_inicio,
    hora_fin: cita.hora_fin,
    lugar: cita.lugar?.trim() || null,
    link_meet: cita.link_meet?.trim() || null,
  };
}

export function citaScheduleChanged(
  before: CitaScheduleSnapshot,
  after: CitaScheduleSnapshot,
): boolean {
  return (
    before.fecha !== after.fecha ||
    before.hora_inicio !== after.hora_inicio ||
    (before.hora_fin ?? "") !== (after.hora_fin ?? "") ||
    (before.lugar ?? "") !== (after.lugar ?? "") ||
    (before.link_meet ?? "") !== (after.link_meet ?? "")
  );
}

export function isCitaActiva(estado: CitaEstado): boolean {
  return estado !== "cancelada";
}
