import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export const GMAIL_CLIPBOARD_COPIED_MESSAGE =
  "✓ Mensaje copiado al portapapeles — pégalo en el cuerpo del email y adjunta el archivo";

export function buildGmailComposeUrl(to: string, subject: string): string {
  const params = new URLSearchParams({
    view: "cm",
    to,
    su: subject,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function openGmailComposeWithClipboard({
  email,
  subject,
  message,
}: {
  email: string;
  subject: string;
  message: string;
}): { copied: boolean } {
  const mensaje = message?.trim() ?? "";

  if (!mensaje) {
    console.log("Intentando copiar mensaje:", "(vacío)");
    console.log("Resultado copia:", false);
    const url = buildGmailComposeUrl(email, subject);
    window.open(url, "_blank", "noopener,noreferrer");
    return { copied: false };
  }

  let resultado = false;

  try {
    console.log("Intentando copiar mensaje:", mensaje.substring(0, 50));
    resultado = copyTextToClipboard(mensaje);
    console.log("Resultado copia:", resultado);
  } catch (error) {
    console.error("Error copiando:", error);
    resultado = false;
  }

  const url = buildGmailComposeUrl(email, subject);
  window.open(url, "_blank", "noopener,noreferrer");
  return { copied: resultado };
}
