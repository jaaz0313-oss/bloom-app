import type { ContratoFirmante } from "@/app/data/contratos";
import { formatWeddingDate } from "@/lib/format";
import { buildGrupoWhatsAppUrl, buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  formatWeddingDateWhatsApp,
  whatsappToBeDefined,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

export type ContratoShareBoda = {
  nombre_pareja: string;
  fecha_boda: string;
  ciudad: string;
  telefono_novia: string | null;
  email_novia: string | null;
  email_novio: string | null;
  whatsapp_grupo_link: string | null;
};

export function buildContratoShareMessage(
  boda: ContratoShareBoda,
  locale: WhatsAppLocale = "es",
): string {
  const nombrePareja =
    boda.nombre_pareja.trim() || (locale === "en" ? "team" : "equipo");
  const ciudad = boda.ciudad.trim() || whatsappToBeDefined(locale);
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fecha_boda, locale)
      : formatWeddingDate(boda.fecha_boda);

  if (locale === "en") {
    return `Hi ${nombrePareja}, please find Celestia's services contract for your wedding on ${fecha} in ${ciudad}. Please review it and let us know when you are ready to sign. We're here for any questions 🌸
- Celestia Team`;
  }

  return `Hola ${nombrePareja}, adjuntamos el contrato de servicios de Celestia para su boda el ${fecha} en ${ciudad}. Por favor revísenlo y confírmen cuando estén listos para firmarlo. Cualquier duda estamos atentos 🌸
- Equipo Celestia`;
}

export function buildContratoShareEmailBody(whatsappMessage: string): string {
  return `${whatsappMessage}

Por favor adjunta manualmente el archivo del contrato (.docx) que generaste en Bloom by Celestia.`;
}

export function buildContratoShareEmailSubject(nombrePareja: string): string {
  const nombre = nombrePareja.trim() || "Boda";
  return `Contrato de servicios - Boda ${nombre} - Celestia Events`;
}

export function getContratoRecipientEmail(
  boda: Pick<ContratoShareBoda, "email_novia" | "email_novio">,
  firmante: ContratoFirmante,
): string | null {
  const email =
    firmante === "novio"
      ? boda.email_novio?.trim()
      : boda.email_novia?.trim();
  return email || null;
}

export function openContratoShareWhatsApp(
  boda: ContratoShareBoda,
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

export function openContratoShareEmail(
  email: string,
  subject: string,
  body: string,
): void {
  const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
