import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findMentionedUsers,
  type EquipoUsuarioMencion,
} from "@/lib/notas-menciones";

const TITULO_MAX = 120;

export type MencionTareaCreada = {
  usuarioId: string;
  username: string;
  nombre: string;
};

export type MencionTareaFallida = {
  usuarioId: string;
  nombre: string;
  message: string;
};

export type CrearTareasMencionNotaResult = {
  created: MencionTareaCreada[];
  failures: MencionTareaFallida[];
};

export function formatNombresLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

export function mensajeTareasAsignadas(nombres: string[]): string {
  if (nombres.length === 0) return "";
  if (nombres.length === 1) return `Tarea asignada a ${nombres[0]}`;
  return `Tareas asignadas a ${formatNombresLista(nombres)}`;
}

/** Fecha local (YYYY-MM-DD), `dias` después de hoy. */
export function fechaLimiteEnDias(dias: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + dias);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildTituloTareaNotaProveedor(
  categoria: string,
  nombreProveedor: string,
): string {
  const titulo = `Nota de ${categoria.trim()} - ${nombreProveedor.trim()}`;
  if (titulo.length <= TITULO_MAX) return titulo;
  return `${titulo.slice(0, TITULO_MAX - 1).trimEnd()}…`;
}

function esConflictoUnico(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || /duplicate key|unique/i.test(error.message ?? "");
}

/**
 * Crea una tarea por cada persona mencionada en la nota del proveedor que
 * no tenga ya una tarea abierta de mención en ese mismo proveedor.
 * No modifica tareas existentes. La misma persona mencionada dos veces
 * cuenta una sola vez.
 */
export async function crearTareasPorMencionesEnNotaProveedor(
  client: SupabaseClient,
  input: {
    proveedorId: string;
    bodaId: string;
    categoria: string;
    nombreProveedor: string;
    nota: string;
    equipo: EquipoUsuarioMencion[];
    autorUsername: string;
  },
): Promise<CrearTareasMencionNotaResult> {
  const nota = input.nota.trim();
  const mencionados = findMentionedUsers(nota, input.equipo);
  if (mencionados.length === 0) {
    return { created: [], failures: [] };
  }

  const autorUsername = input.autorUsername.trim();
  if (!autorUsername) {
    return {
      created: [],
      failures: mencionados.map((user) => ({
        usuarioId: user.id,
        nombre: user.nombre,
        message: "No se pudo identificar quién escribe la nota.",
      })),
    };
  }

  const { data: abiertas, error: abiertasError } = await client
    .from("tareas")
    .select("asignado_a")
    .eq("proveedor_id", input.proveedorId)
    .eq("desde_mencion_notas", true)
    .eq("completada", false);

  if (abiertasError) {
    return {
      created: [],
      failures: mencionados.map((user) => ({
        usuarioId: user.id,
        nombre: user.nombre,
        message: abiertasError.message,
      })),
    };
  }

  const conTareaAbierta = new Set(
    (abiertas ?? []).map((row) => String(row.asignado_a ?? "")),
  );

  const created: MencionTareaCreada[] = [];
  const failures: MencionTareaFallida[] = [];
  const titulo = buildTituloTareaNotaProveedor(
    input.categoria,
    input.nombreProveedor,
  );
  const fechaLimite = fechaLimiteEnDias(3);

  for (const user of mencionados) {
    const username = user.username.trim();
    if (!username) {
      failures.push({
        usuarioId: user.id,
        nombre: user.nombre,
        message: "El usuario no tiene nombre de usuario.",
      });
      continue;
    }

    if (conTareaAbierta.has(username)) continue;

    const { error: insertError } = await client.from("tareas").insert({
      titulo,
      descripcion: nota,
      boda_id: input.bodaId,
      proveedor_id: input.proveedorId,
      desde_mencion_notas: true,
      asignado_a: username,
      creado_por: autorUsername,
      prioridad: "media",
      fecha_limite: fechaLimite,
      completada: false,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      if (esConflictoUnico(insertError)) {
        conTareaAbierta.add(username);
        continue;
      }
      failures.push({
        usuarioId: user.id,
        nombre: user.nombre,
        message: insertError.message,
      });
      continue;
    }

    conTareaAbierta.add(username);
    created.push({
      usuarioId: user.id,
      username,
      nombre: user.nombre,
    });
  }

  return { created, failures };
}
