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
import { formatLongDateStable, formatLongDateEnglishStable, formatTimeEnglishStable } from "@/lib/format";
import { buildWhatsAppUrl, normalizeWhatsAppGroupLink } from "@/lib/whatsapp";
import type { UserRole } from "@/lib/auth/roles";

export type CitaProveedorLookup = {
  nombre: string;
  telefono?: string | null;
};

export type CitaBodaWhatsAppLookup = Pick<
  BodaRow,
  "nombre_pareja" | "telefono_novia" | "telefono_novio" | "whatsapp_grupo_link"
>;

export type CitaWhatsAppLookupContext = {
  bodasById: Record<string, CitaBodaWhatsAppLookup>;
  leadsById: Record<string, Pick<LeadRow, "nombre_pareja">>;
  proveedoresById?: Record<string, CitaProveedorLookup>;
};

export type CitaWhatsAppLocale = "es" | "en";

export const CITA_WHATSAPP_LOCALE_SESSION_KEY = "celestia-cita-whatsapp-locale";

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

function formatCitaHoraTextoEnglish(horaInicio: string, horaFin?: string | null): string {
  const horaInicioFmt = formatTimeEnglishStable(horaInicio);
  return horaFin?.trim() ?
      `${horaInicioFmt} - ${formatTimeEnglishStable(horaFin)}`
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

export function getProveedorTelefonoForCita(
  cita: Pick<CitaRow, "proveedor_id">,
  proveedoresById?: Record<string, CitaProveedorLookup>,
): string | null {
  if (!cita.proveedor_id) return null;
  const telefono = proveedoresById?.[cita.proveedor_id]?.telefono?.trim();
  return telefono || null;
}

function buildCitaWhatsAppLugarMeetLines(
  lugar?: string | null,
  linkMeet?: string | null,
): string[] {
  const lines: string[] = [];
  if (lugar?.trim()) lines.push(`📍 ${lugar.trim()}`);
  if (linkMeet?.trim()) lines.push(`🔗 ${linkMeet.trim()}`);
  return lines;
}

export function buildCitaRecordatorioClienteWhatsAppMessage(params: {
  nombreCliente: string;
  horaInicio: string;
  lugar?: string | null;
  linkMeet?: string | null;
}): string {
  const lines = [
    `Hola ${params.nombreCliente.trim()}, te recordamos tu cita con Celestia hoy:`,
    `🕐 ${formatTimeStable(params.horaInicio)}`,
    ...buildCitaWhatsAppLugarMeetLines(params.lugar, params.linkMeet),
    "",
    "Por favor confírmanos tu asistencia respondiendo:",
    "✅ CONFIRMO - si asistirás",
    "❌ CANCELO - si no puedes asistir",
    "",
    "¡Te esperamos! 🌸",
  ];
  return lines.join("\n");
}

export function buildCitaRecordatorioClienteWhatsAppMessageFromCita(
  cita: Pick<
    CitaRow,
    "hora_inicio" | "lugar" | "link_meet" | "boda_id" | "lead_id"
  >,
  context: CitaWhatsAppLookupContext,
): string | null {
  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  if (!cliente?.nombre?.trim()) return null;

  return buildCitaRecordatorioClienteWhatsAppMessage({
    nombreCliente: cliente.nombre,
    horaInicio: cita.hora_inicio,
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
  });
}

export function buildCitaRecordatorioProveedorWhatsAppMessage(params: {
  nombreProveedor: string;
  nombrePareja: string;
  horaInicio: string;
  lugar?: string | null;
  linkMeet?: string | null;
}): string {
  const lines = [
    `Hola ${params.nombreProveedor.trim()}, te recordamos nuestra reunión con los novios ${params.nombrePareja.trim()} hoy a las ${formatTimeStable(params.horaInicio)}.`,
    ...buildCitaWhatsAppLugarMeetLines(params.lugar, params.linkMeet),
    "",
    "Por favor confírmanos tu asistencia respondiendo:",
    "✅ CONFIRMO",
    "❌ CANCELO",
    "",
    "¡Hasta pronto! 🌸",
  ];
  return lines.join("\n");
}

export function buildCitaRecordatorioProveedorWhatsAppMessageFromCita(
  cita: Pick<
    CitaRow,
    | "tipo"
    | "titulo"
    | "proveedor_id"
    | "hora_inicio"
    | "lugar"
    | "link_meet"
    | "boda_id"
    | "lead_id"
  >,
  context: CitaWhatsAppLookupContext,
): string | null {
  if (cita.tipo !== "reunion_proveedor") return null;

  const nombreProveedor = getProveedorNombreForCita(cita, context.proveedoresById);
  if (!nombreProveedor) return null;

  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  const nombrePareja = cliente?.nombre?.trim();
  if (!nombrePareja) return null;

  return buildCitaRecordatorioProveedorWhatsAppMessage({
    nombreProveedor,
    nombrePareja,
    horaInicio: cita.hora_inicio,
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
  });
}

function buildCitaWhatsAppDetalleLines(
  params: {
    fecha: string;
    horaInicio: string;
    horaFin?: string | null;
    tipo: CitaTipo;
    proveedorNombre?: string | null;
    lugar?: string | null;
    linkMeet?: string | null;
  },
  locale: CitaWhatsAppLocale = "es",
): string[] {
  const fechaNorm = normalizeCitaFecha(params.fecha);
  const lines = [
    locale === "en"
      ? `📅 ${formatLongDateEnglishStable(fechaNorm)}`
      : `📅 ${formatLongDateStable(fechaNorm)}`,
    locale === "en"
      ? `🕐 ${formatCitaHoraTextoEnglish(params.horaInicio, params.horaFin)}`
      : `🕐 ${formatCitaHoraTexto(params.horaInicio, params.horaFin)}`,
  ];

  if (params.tipo === "reunion_proveedor" && params.proveedorNombre?.trim()) {
    lines.push(
      locale === "en"
        ? `👤 Provider: ${params.proveedorNombre.trim()}`
        : `👤 Proveedor: ${params.proveedorNombre.trim()}`,
    );
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
  bodasById: Record<string, CitaBodaWhatsAppLookup>,
  leadsById: Record<string, Pick<LeadRow, "nombre_pareja">>,
): ClienteCitaInfo | null {
  if (cita.boda_id) {
    const boda = bodasById[cita.boda_id];
    if (!boda) return null;
    return {
      nombre: boda.nombre_pareja,
      telefono: boda.telefono_novia?.trim() || null,
    };
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
  locale?: CitaWhatsAppLocale;
}): string {
  const {
    nombreCliente,
    fecha,
    horaInicio,
    horaFin,
    tipo,
    proveedorNombre,
    lugar,
    linkMeet,
    locale = "es",
  } = params;

  const lines =
    locale === "en"
      ? [
          `Hi ${nombreCliente.trim()}, we confirm your appointment with Celestia:`,
          ...buildCitaWhatsAppDetalleLines(
            {
              fecha,
              horaInicio,
              horaFin,
              tipo: tipo ?? "reunion_seguimiento",
              proveedorNombre,
              lugar,
              linkMeet,
            },
            locale,
          ),
          "We look forward to seeing you! Feel free to reach out with any questions 🌸",
          "- Celestia Team",
        ]
      : [
          `Hola ${nombreCliente.trim()}, confirmamos tu cita con Celestia:`,
          ...buildCitaWhatsAppDetalleLines(
            {
              fecha,
              horaInicio,
              horaFin,
              tipo: tipo ?? "reunion_seguimiento",
              proveedorNombre,
              lugar,
              linkMeet,
            },
            locale,
          ),
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

export function buildCitaGrupoConfirmacionWhatsAppMessage(params: {
  nombrePareja?: string | null;
  fecha: string;
  horaInicio: string;
  horaFin?: string | null;
  tipo?: CitaTipo;
  proveedorNombre?: string | null;
  lugar?: string | null;
  linkMeet?: string | null;
  locale?: CitaWhatsAppLocale;
}): string {
  const {
    nombrePareja,
    fecha,
    horaInicio,
    horaFin,
    tipo,
    proveedorNombre,
    lugar,
    linkMeet,
    locale = "es",
  } = params;

  const detalle = buildCitaWhatsAppDetalleLines(
    {
      fecha,
      horaInicio,
      horaFin,
      tipo: tipo ?? "reunion_seguimiento",
      proveedorNombre,
      lugar,
      linkMeet,
    },
    locale,
  );

  if (locale === "en") {
    const saludo =
      nombrePareja?.trim()
        ? `Hi ${nombrePareja.trim()}, we confirm your appointment with Celestia:`
        : "Hi, we confirm your appointment with Celestia:";
    return [
      saludo,
      ...detalle,
      "We look forward to seeing you! Feel free to reach out with any questions 🌸",
      "- Celestia Team",
    ].join("\n");
  }

  const saludo =
    nombrePareja?.trim()
      ? `Hola ${nombrePareja.trim()}, agendamos una nueva cita con Celestia:`
      : "Hola, agendamos una nueva cita con Celestia:";

  return [saludo, ...detalle, "¡Los esperamos! 🌸"].join("\n");
}

export function buildCitaGrupoConfirmacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
  locale: CitaWhatsAppLocale = "es",
): string {
  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);

  return buildCitaGrupoConfirmacionWhatsAppMessage({
    nombrePareja: cliente?.nombre ?? null,
    fecha: cita.fecha,
    horaInicio: cita.hora_inicio,
    horaFin: cita.hora_fin,
    tipo: cita.tipo,
    proveedorNombre: getProveedorNombreForCita(cita, context.proveedoresById),
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
    locale,
  });
}

export function buildCitaProveedorConfirmacionWhatsAppMessage(params: {
  nombreProveedor: string;
  nombrePareja: string;
  fecha: string;
  horaInicio: string;
  horaFin?: string | null;
  lugar?: string | null;
  linkMeet?: string | null;
  locale?: CitaWhatsAppLocale;
}): string {
  const {
    nombreProveedor,
    nombrePareja,
    fecha,
    horaInicio,
    horaFin,
    lugar,
    linkMeet,
    locale = "es",
  } = params;
  const fechaNorm = normalizeCitaFecha(fecha);

  if (locale === "en") {
    const lines = [
      `Hi ${nombreProveedor.trim()}, we confirm our meeting with the couple ${nombrePareja.trim()}:`,
      `📅 ${formatLongDateEnglishStable(fechaNorm)}`,
      `🕐 ${formatCitaHoraTextoEnglish(horaInicio, horaFin)}`,
      ...buildCitaWhatsAppLugarMeetLines(lugar, linkMeet),
      "See you soon! 🌸",
    ];
    return lines.join("\n");
  }

  const lines = [
    `Hola ${nombreProveedor.trim()}, confirmamos nuestra reunión con los novios ${nombrePareja.trim()}:`,
    `📅 ${formatLongDateStable(fechaNorm)}`,
    `🕐 ${formatCitaHoraTexto(horaInicio, horaFin)}`,
    ...buildCitaWhatsAppLugarMeetLines(lugar, linkMeet),
    "¡Hasta pronto! 🌸",
  ];
  return lines.join("\n");
}

export function buildCitaProveedorConfirmacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
  locale: CitaWhatsAppLocale = "es",
): string | null {
  if (cita.tipo !== "reunion_proveedor") return null;

  const nombreProveedor = getProveedorNombreForCita(cita, context.proveedoresById);
  if (!nombreProveedor) return null;

  const cliente = getClienteInfoForCita(cita, context.bodasById, context.leadsById);
  const nombrePareja = cliente?.nombre?.trim();
  if (!nombrePareja) return null;

  return buildCitaProveedorConfirmacionWhatsAppMessage({
    nombreProveedor,
    nombrePareja,
    fecha: cita.fecha,
    horaInicio: cita.hora_inicio,
    horaFin: cita.hora_fin,
    lugar: cita.lugar,
    linkMeet: cita.link_meet,
    locale,
  });
}

export function getCitaWhatsAppUrl(
  telefono: string | null | undefined,
  message: string,
): string | null {
  if (!telefono?.trim()) return null;
  return buildWhatsAppUrl(telefono, message);
}

export type CitaClienteWhatsAppTarget = {
  url: string;
  /** Grupo de WhatsApp: abrir link sin ?text= y copiar mensaje manualmente. */
  copyMessageBeforeOpen: boolean;
};

/** WhatsApp al cliente: grupo (sin ?text=) o teléfono de la novia con mensaje prellenado. */
export function getCitaClienteWhatsAppTarget(
  cita: Pick<CitaRow, "boda_id" | "lead_id">,
  message: string,
  bodasById: Record<string, CitaBodaWhatsAppLookup>,
): CitaClienteWhatsAppTarget | null {
  if (!message.trim() || !cita.boda_id) return null;

  const boda = bodasById[cita.boda_id];
  if (!boda) return null;

  const grupoLink = boda.whatsapp_grupo_link?.trim();
  if (grupoLink) {
    const url = normalizeWhatsAppGroupLink(grupoLink);
    if (!url) return null;
    return { url, copyMessageBeforeOpen: true };
  }

  const phoneUrl = getCitaWhatsAppUrl(boda.telefono_novia, message);
  if (!phoneUrl) return null;
  return { url: phoneUrl, copyMessageBeforeOpen: false };
}

/** WhatsApp al cliente: grupo de la boda o teléfono de la novia. */
export function getCitaClienteWhatsAppUrl(
  cita: Pick<CitaRow, "boda_id" | "lead_id">,
  message: string,
  bodasById: Record<string, CitaBodaWhatsAppLookup>,
): string | null {
  return getCitaClienteWhatsAppTarget(cita, message, bodasById)?.url ?? null;
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
  locale?: CitaWhatsAppLocale;
}): string {
  const {
    nombreCliente,
    fecha,
    horaInicio,
    horaFin,
    tipo,
    proveedorNombre,
    lugar,
    linkMeet,
    locale = "es",
  } = params;

  const detalle = buildCitaWhatsAppDetalleLines(
    {
      fecha,
      horaInicio,
      horaFin,
      tipo: tipo ?? "reunion_seguimiento",
      proveedorNombre,
      lugar,
      linkMeet,
    },
    locale,
  );

  if (locale === "en") {
    return [
      `Hi ${nombreCliente.trim()}, we confirm the changes to your appointment with Celestia:`,
      ...detalle,
      "We look forward to seeing you! Feel free to reach out with any questions 🌸",
      "- Celestia Team",
    ].join("\n");
  }

  return [
    `Hola ${nombreCliente.trim()}, te confirmamos los cambios en tu cita con Celestia:`,
    ...detalle,
    "¡Te esperamos! Cualquier duda estamos atentos 🌸",
  ].join("\n");
}

export function buildCitaModificacionWhatsAppMessageFromCita(
  cita: CitaWhatsAppFields,
  context: CitaWhatsAppLookupContext,
  locale: CitaWhatsAppLocale = "es",
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
    locale,
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
