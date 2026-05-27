import { formatWeddingDate } from "@/lib/format";
import { loadPlannerSettings } from "@/lib/planner-settings";

export type WhatsAppRecipient = "novia" | "novio";

export type WhatsAppTemplateId =
  | "bienvenida"
  | "recordatorio_pago"
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

export type WhatsAppMessageContext = {
  recipient: WhatsAppRecipient;
  nombreNovia: string | null;
  nombreNovio: string | null;
  fechaBoda: string;
  ciudad: string;
  proveedorNombre?: string;
  customMessage?: string;
  plannerName?: string;
};

export function getRecipientDisplayName(
  recipient: WhatsAppRecipient,
  nombreNovia: string | null,
  nombreNovio: string | null,
): string {
  const raw =
    recipient === "novia"
      ? nombreNovia?.trim()
      : nombreNovio?.trim();
  if (!raw) return recipient === "novia" ? "Novia" : "Novio";
  return raw.split(/\s+/)[0] ?? raw;
}

export function buildWhatsAppMessage(
  templateId: WhatsAppTemplateId,
  context: WhatsAppMessageContext,
): string {
  if (templateId === "personalizado") {
    return context.customMessage?.trim() ?? "";
  }

  const template = WHATSAPP_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return "";

  const planner =
    context.plannerName?.trim() ||
    loadPlannerSettings().name ||
    "tu wedding planner";
  const nombre = getRecipientDisplayName(
    context.recipient,
    context.nombreNovia,
    context.nombreNovio,
  );
  const fecha = formatWeddingDate(context.fechaBoda);
  const proveedor = context.proveedorNombre?.trim() || "el proveedor";

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
