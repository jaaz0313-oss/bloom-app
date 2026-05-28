import { formatCurrency, formatShortDate, formatWeddingDate } from "@/lib/format";
import { loadPlannerSettings } from "@/lib/planner-settings";
import type { ProveedorRow } from "@/app/data/providers";
import {
  getProviderSaldoPendienteConPagos,
  getUltimoMontoPagoRegistrado,
} from "@/app/data/providers";
import type { PagoRow } from "@/app/data/pagos";

export type WhatsAppRecipient = "novia" | "novio" | "grupo";

export type WhatsAppTemplateId =
  | "bienvenida"
  | "recordatorio_pago"
  | "confirmacion_pago_realizado"
  | "recordatorio_con_opcion_tarjeta"
  | "solicitar_link_pago_proveedor"
  | "enviar_link_pago_cliente"
  | "confirmacion_proveedor"
  | "recordatorio_reunion"
  | "personalizado";

export type WhatsAppTemplate = {
  id: WhatsAppTemplateId;
  label: string;
  body: string;
};

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "bienvenida",
    label: "Bienvenida",
    body: "Hola [nombre], soy [planner] tu wedding planner. Estamos muy emocionados de acompañarlos en su boda el [fecha] en [ciudad]. Cualquier duda estoy aquí para ayudarles.",
  },
  {
    id: "recordatorio_pago",
    label: "Recordatorio de pago",
    body: "Hola [nombre], te recuerdo que tienes un pago pendiente próximo a vencer. Quedamos atentos para coordinar.",
  },
  {
    id: "recordatorio_con_opcion_tarjeta",
    label: "Recordatorio con opción tarjeta",
    body: "",
  },
  {
    id: "confirmacion_pago_realizado",
    label: "Confirmación de pago realizado",
    body: "",
  },
  {
    id: "solicitar_link_pago_proveedor",
    label: "Solicitar link de pago al proveedor",
    body: "",
  },
  {
    id: "enviar_link_pago_cliente",
    label: "Enviar link de pago al cliente",
    body: "",
  },
  {
    id: "confirmacion_proveedor",
    label: "Confirmación de proveedor",
    body: "Hola [nombre], queremos confirmarte que [proveedor] ya está contratado para su boda. Todo va marchando perfecto.",
  },
  {
    id: "recordatorio_reunion",
    label: "Recordatorio de reunión",
    body: "Hola [nombre], te recuerdo nuestra reunión próxima para revisar los detalles de su boda. Confirmamos horario pronto.",
  },
  {
    id: "personalizado",
    label: "Mensaje personalizado",
    body: "",
  },
];

export const WHATSAPP_TEMPLATES_WITH_PROVEEDOR: WhatsAppTemplateId[] = [
  "confirmacion_proveedor",
  "confirmacion_pago_realizado",
  "recordatorio_con_opcion_tarjeta",
  "solicitar_link_pago_proveedor",
  "enviar_link_pago_cliente",
];

export const WHATSAPP_TEMPLATES_CONTRATADOS_ONLY: WhatsAppTemplateId[] = [
  "confirmacion_pago_realizado",
  "recordatorio_con_opcion_tarjeta",
  "solicitar_link_pago_proveedor",
  "enviar_link_pago_cliente",
];

export type WhatsAppMessageContext = {
  recipient: WhatsAppRecipient;
  nombreNovia: string | null;
  nombreNovio: string | null;
  nombrePareja?: string | null;
  fechaBoda: string;
  ciudad: string;
  proveedor?: ProveedorRow | null;
  pagosProveedor?: PagoRow[];
  proveedorNombre?: string;
  customMessage?: string;
  plannerName?: string;
};

export function getRecipientDisplayName(
  recipient: WhatsAppRecipient,
  nombreNovia: string | null,
  nombreNovio: string | null,
  nombrePareja?: string | null,
): string {
  if (recipient === "grupo") {
    return nombrePareja?.trim() || "equipo";
  }

  const raw =
    recipient === "novia"
      ? nombreNovia?.trim()
      : nombreNovio?.trim();
  if (!raw) return recipient === "novia" ? "Novia" : "Novio";
  return raw.split(/\s+/)[0] ?? raw;
}

function formatDatoProveedor(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "No registrado";
}

function buildRecordatorioConTarjetaMessage(
  nombre: string,
  proveedor: ProveedorRow,
  pagos: PagoRow[],
): string {
  const saldo = getProviderSaldoPendienteConPagos(proveedor, pagos);
  const fechaLimite = proveedor.fecha_saldo
    ? formatShortDate(proveedor.fecha_saldo)
    : "No registrada";

  return `Hola ${nombre}, te recordamos que tienes un pago pendiente con ${proveedor.nombre}:
💰 Valor: ${formatCurrency(saldo)}
📅 Fecha límite: ${fechaLimite}
🏦 Banco: ${formatDatoProveedor(proveedor.banco)}
🏷️ Tipo de cuenta: ${formatDatoProveedor(proveedor.tipo_cuenta)}
📋 Cuenta: ${formatDatoProveedor(proveedor.numero_cuenta)}
👤 Titular: ${formatDatoProveedor(proveedor.titular_cuenta)}

Si prefieres pagar con tarjeta de crédito, confírmanos y te enviamos el link de pago. 💳`;
}

function buildConfirmacionPagoRealizadoMessage(
  nombre: string,
  proveedor: ProveedorRow,
  pagos: PagoRow[],
  fechaBoda: string,
): string {
  const monto = getUltimoMontoPagoRegistrado(proveedor, pagos);
  const montoTexto =
    monto > 0 ? formatCurrency(monto) : "el monto acordado";

  return `Hola ${nombre}, confirmamos que el pago a ${proveedor.nombre} por ${montoTexto} fue realizado exitosamente. ¡Todo va marchando perfecto para su boda el ${formatWeddingDate(fechaBoda)}! 🌸`;
}

function buildSolicitarLinkPagoProveedorMessage(
  proveedor: ProveedorRow,
  nombreBoda: string,
  pagos: PagoRow[],
): string {
  const saldo = getProviderSaldoPendienteConPagos(proveedor, pagos);
  return `Hola ${proveedor.nombre}, los novios ${nombreBoda} desean realizar el pago de ${formatCurrency(saldo)} con tarjeta de crédito. ¿Nos puedes compartir el link de pago? Gracias 🙏`;
}

function buildEnviarLinkPagoClienteMessage(
  nombre: string,
  proveedor: ProveedorRow,
  pagos: PagoRow[],
): string {
  const saldo = getProviderSaldoPendienteConPagos(proveedor, pagos);
  const linkPago = proveedor.link_pago?.trim() || "";
  return `Hola ${nombre}, aquí está el link para realizar el pago a ${proveedor.nombre} por ${formatCurrency(saldo)}:
🔗 ${linkPago}
Cualquier duda estamos atentos. 🌸`;
}

export function buildWhatsAppMessage(
  templateId: WhatsAppTemplateId,
  context: WhatsAppMessageContext,
): string {
  if (templateId === "personalizado") {
    return context.customMessage?.trim() ?? "";
  }

  const nombre = getRecipientDisplayName(
    context.recipient,
    context.nombreNovia,
    context.nombreNovio,
    context.nombrePareja,
  );

  if (templateId === "recordatorio_con_opcion_tarjeta" && context.proveedor) {
    return buildRecordatorioConTarjetaMessage(
      nombre,
      context.proveedor,
      context.pagosProveedor ?? [],
    );
  }

  if (templateId === "confirmacion_pago_realizado" && context.proveedor) {
    return buildConfirmacionPagoRealizadoMessage(
      nombre,
      context.proveedor,
      context.pagosProveedor ?? [],
      context.fechaBoda,
    );
  }

  if (templateId === "solicitar_link_pago_proveedor" && context.proveedor) {
    return buildSolicitarLinkPagoProveedorMessage(
      context.proveedor,
      context.nombrePareja?.trim() || "la boda",
      context.pagosProveedor ?? [],
    );
  }

  if (templateId === "enviar_link_pago_cliente" && context.proveedor) {
    return buildEnviarLinkPagoClienteMessage(
      nombre,
      context.proveedor,
      context.pagosProveedor ?? [],
    );
  }

  const template = WHATSAPP_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return "";

  const planner =
    context.plannerName?.trim() ||
    loadPlannerSettings().name ||
    "tu wedding planner";
  const fecha = formatWeddingDate(context.fechaBoda);
  const proveedor =
    context.proveedor?.nombre?.trim() ||
    context.proveedorNombre?.trim() ||
    "el proveedor";

  return template.body
    .replace(/\[nombre\]/g, nombre)
    .replace(/\[planner\]/g, planner)
    .replace(/\[fecha\]/g, fecha)
    .replace(/\[ciudad\]/g, context.ciudad)
    .replace(/\[proveedor\]/g, proveedor);
}

/** Normaliza teléfono colombiano u internacional para wa.me (solo dígitos, con código país). */
export function formatPhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `57${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) {
    return `57${digits.slice(1)}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = formatPhoneForWhatsApp(phone);
  if (!normalized || !message.trim()) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** Abre el link del grupo con el mensaje prellenado (?text=). */
export function buildGrupoWhatsAppUrl(
  groupLink: string,
  message: string,
): string | null {
  const link = groupLink.trim();
  if (!link || !message.trim()) return null;

  try {
    const url = new URL(link.startsWith("http") ? link : `https://${link}`);
    url.searchParams.set("text", message);
    return url.toString();
  } catch {
    const separator = link.includes("?") ? "&" : "?";
    return `${link}${separator}text=${encodeURIComponent(message)}`;
  }
}
