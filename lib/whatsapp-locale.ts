import {
  formatClienteCurrency,
  formatClienteShortDate,
  formatClienteWeddingDate,
  type ClienteLocale,
} from "@/lib/cliente-i18n";

export type WhatsAppLocale = ClienteLocale;

export function formatWeddingDateWhatsApp(
  isoDate: string,
  locale: WhatsAppLocale,
): string {
  return formatClienteWeddingDate(isoDate, locale);
}

export function formatShortDateWhatsApp(
  isoDate: string,
  locale: WhatsAppLocale,
): string {
  return formatClienteShortDate(isoDate, locale);
}

export function formatCurrencyWhatsApp(
  amount: number,
  locale: WhatsAppLocale,
): string {
  return formatClienteCurrency(amount, locale);
}

export function whatsappNotRegistered(locale: WhatsAppLocale): string {
  return locale === "en" ? "Not registered" : "No registrado";
}

export function whatsappToBeDefined(locale: WhatsAppLocale): string {
  return locale === "en" ? "To be defined" : "Por definir";
}
