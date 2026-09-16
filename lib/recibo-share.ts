import { formatCurrency, formatWeddingDate } from "@/lib/format";
import { openGmailComposeWithClipboard } from "@/lib/gmail-compose";
import { buildGrupoWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  formatWeddingDateWhatsApp,
  whatsappToBeDefined,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

export type ReciboShareBoda = {
  nombre_pareja: string;
  fecha_boda: string;
  ciudad: string;
  telefono_novia: string | null;
  email_novia: string | null;
  email_novio: string | null;
  whatsapp_grupo_link: string | null;
};

export function buildReciboShareMessage(
  boda: ReciboShareBoda,
  opts: { concepto: string; total: number },
  locale: WhatsAppLocale = "es",
): string {
  const nombrePareja =
    boda.nombre_pareja.trim() || (locale === "en" ? "team" : "equipo");
  const ciudad = boda.ciudad?.trim() || whatsappToBeDefined(locale);
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fecha_boda, locale)
      : formatWeddingDate(boda.fecha_boda);
  const monto = formatCurrency(opts.total);
  const concepto = opts.concepto.trim() || (locale === "en" ? "payment" : "pago");

  if (locale === "en") {
    return `Hi ${nombrePareja}, please find the payment receipt from Celestia (${concepto} · ${monto}) for your wedding on ${fecha} in ${ciudad}. Thank you! 🌸
- Celestia Team`;
  }

  return `Hola ${nombrePareja}, adjuntamos el recibo de pago de Celestia (${concepto} · ${monto}) correspondiente a su boda el ${fecha} en ${ciudad}. ¡Gracias! 🌸
- Equipo Celestia`;
}

export function buildReciboShareEmailMessage(
  boda: ReciboShareBoda,
  opts: { concepto: string; total: number },
): string {
  const nombrePareja = boda.nombre_pareja.trim() || "equipo";
  const monto = formatCurrency(opts.total);
  const concepto = opts.concepto.trim() || "pago";

  return `Hola ${nombrePareja},

Adjunto encontrarán el recibo de pago correspondiente a: ${concepto} por ${monto}.

Si tienen cualquier duda, estaré muy atenta.

Un abrazo,
Luisa Bustamante
Celestia Events
319 553 8654
celestiaandevents@gmail.com`;
}

export function buildReciboShareEmailSubject(nombrePareja: string): string {
  const nombre = nombrePareja.trim() || "Boda";
  return `Recibo de pago - Boda ${nombre} - Celestia Events`;
}

export function getReciboRecipientEmail(
  boda: Pick<ReciboShareBoda, "email_novia" | "email_novio">,
  preferNovio = false,
): string | null {
  const primary = preferNovio ? boda.email_novio : boda.email_novia;
  const fallback = preferNovio ? boda.email_novia : boda.email_novio;
  return primary?.trim() || fallback?.trim() || null;
}

export function openReciboShareWhatsApp(
  boda: ReciboShareBoda,
  message: string,
): boolean {
  const grupoLink = boda.whatsapp_grupo_link?.trim();
  if (grupoLink) {
    const url = buildGrupoWhatsAppUrl(grupoLink, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
  }

  const telefonoNovia = boda.telefono_novia?.trim();
  if (telefonoNovia) {
    const url = buildWhatsAppUrl(telefonoNovia, message);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }
  }

  return false;
}
