const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** Correo que se puede invitar a una cita. Vacío, inválido o interno queda fuera. */
export function normalizeCitaClienteEmail(
  value: string | null | undefined,
): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email) return null;
  if (email.endsWith(".internal")) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  return email;
}

/** Novia y novio de la boda, o el correo del lead. Sin equipo ni proveedores. */
export function buildCitaClienteInvitados(input: {
  emailNovia?: string | null;
  emailNovio?: string | null;
  leadEmail?: string | null;
}): string[] {
  const seen = new Set<string>();
  const invitados: string[] = [];

  for (const raw of [input.emailNovia, input.emailNovio, input.leadEmail]) {
    const email = normalizeCitaClienteEmail(raw);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    invitados.push(email);
  }

  return invitados;
}
