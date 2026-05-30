import { buildWhatsAppUrl } from "@/lib/whatsapp";

export type EquipoUsuarioMencion = {
  id: string;
  nombre: string;
  username: string;
  telefono: string | null;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Usuarios mencionados con @Nombre (nombre completo del perfil). */
export function findMentionedUsers(
  contenido: string,
  equipo: EquipoUsuarioMencion[],
): EquipoUsuarioMencion[] {
  const mentioned: EquipoUsuarioMencion[] = [];
  const seen = new Set<string>();

  const sorted = [...equipo].sort(
    (a, b) => b.nombre.trim().length - a.nombre.trim().length,
  );

  for (const user of sorted) {
    const nombre = user.nombre.trim();
    if (!nombre || seen.has(user.id)) continue;

    const pattern = new RegExp(`@${escapeRegExp(nombre)}(?=\\s|$|[.,!?;:])`, "i");
    if (pattern.test(contenido)) {
      seen.add(user.id);
      mentioned.push(user);
    }
  }

  return mentioned;
}

export function buildMencionNotaWhatsAppMessage(params: {
  nombreDestinatario: string;
  bodaNombre: string;
  contenidoNota: string;
  autorNombre: string;
}): string {
  const { nombreDestinatario, bodaNombre, contenidoNota, autorNombre } = params;
  return `Hola ${nombreDestinatario.trim()}, te mencionaron en una nota de la boda ${bodaNombre.trim()}:
'${contenidoNota.trim()}'
- ${autorNombre.trim()}`;
}

export function buildMencionNotaWhatsAppUrls(
  mencionados: EquipoUsuarioMencion[],
  params: {
    bodaNombre: string;
    contenidoNota: string;
    autorNombre: string;
  },
): string[] {
  const urls: string[] = [];

  for (const user of mencionados) {
    if (!user.telefono?.trim()) continue;
    const message = buildMencionNotaWhatsAppMessage({
      nombreDestinatario: user.nombre,
      bodaNombre: params.bodaNombre,
      contenidoNota: params.contenidoNota,
      autorNombre: params.autorNombre,
    });
    const url = buildWhatsAppUrl(user.telefono, message);
    if (url) urls.push(url);
  }

  return urls;
}

/** Abre una pestaña de WhatsApp por mencionado (evita bloqueo total del popup). */
export function openMencionNotaWhatsAppTabs(urls: string[]): void {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    }, index * 400);
  });
}

export function filterEquipoForMentionQuery(
  equipo: EquipoUsuarioMencion[],
  query: string,
): EquipoUsuarioMencion[] {
  const q = query.trim().toLowerCase();
  if (!q) return equipo;

  return equipo.filter(
    (u) =>
      u.nombre.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q),
  );
}
