import type { CitaTipo } from "@/app/data/citas";
import { toInternalEmail } from "@/lib/auth/internal-email";

export type CitaInvolvedEmail = {
  label: string;
  email: string;
};

type EquipoMember = {
  id: string;
  nombre: string;
  email?: string | null;
  username?: string | null;
};

type BodaEmails = {
  email_novia: string | null;
  email_novio: string | null;
};

type ProveedorEmail = {
  nombre: string;
  email: string | null;
};

function addEmail(
  list: CitaInvolvedEmail[],
  seen: Set<string>,
  label: string,
  raw: string | null | undefined,
) {
  const email = raw?.trim();
  if (!email || seen.has(email.toLowerCase())) return;
  seen.add(email.toLowerCase());
  list.push({ label, email });
}

export function collectCitaInvolvedEmails(params: {
  tipo: CitaTipo;
  relacionTipo: "ninguna" | "boda" | "lead";
  bodaId: string;
  asignadoId: string;
  equipo: EquipoMember[];
  boda: BodaEmails | null;
  proveedor: ProveedorEmail | null;
}): CitaInvolvedEmail[] {
  const { tipo, relacionTipo, bodaId, asignadoId, equipo, boda, proveedor } = params;
  const result: CitaInvolvedEmail[] = [];
  const seen = new Set<string>();

  const asignado = equipo.find((u) => u.id === asignadoId);
  if (asignado) {
    const teamEmail =
      asignado.email?.trim() ||
      (asignado.username?.trim() ? toInternalEmail(asignado.username) : null);
    addEmail(result, seen, `Equipo (${asignado.nombre})`, teamEmail);
  }

  if (relacionTipo === "boda" && bodaId && boda) {
    addEmail(result, seen, "Novia", boda.email_novia);
    addEmail(result, seen, "Novio", boda.email_novio);
  }

  if (tipo === "reunion_proveedor" && proveedor?.nombre.trim()) {
    addEmail(
      result,
      seen,
      `Proveedor (${proveedor.nombre.trim()})`,
      proveedor.email,
    );
  }

  return result;
}

export function emailsToStrings(entries: CitaInvolvedEmail[]): string[] {
  return entries.map((e) => e.email);
}
