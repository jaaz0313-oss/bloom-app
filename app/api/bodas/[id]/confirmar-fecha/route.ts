import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { normalizeBodaFecha } from "@/lib/boda-fecha-confirmada-utils";
import {
  createBodaFechaConfirmadaEvent,
  deleteCalendarEventIfExists,
} from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BodaFechaRow = {
  id: string;
  nombre_pareja: string;
  fecha_boda: string;
  fecha_confirmada: boolean | null;
  google_event_id_fecha: string | null;
  fecha_boda_confirmada: string | null;
};

function canConfirmBodaFecha(rol: string): boolean {
  return rol === "admin" || rol === "lider";
}

async function fetchBoda(
  client: SupabaseClient,
  bodaId: string,
): Promise<BodaFechaRow | null> {
  const { data, error } = await client
    .from("bodas")
    .select(
      "id, nombre_pareja, fecha_boda, fecha_confirmada, google_event_id_fecha, fecha_boda_confirmada",
    )
    .eq("id", bodaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BodaFechaRow | null) ?? null;
}

async function confirmarFechaBoda(
  client: SupabaseClient,
  bodaId: string,
): Promise<{ googleEventId: string }> {
  const boda = await fetchBoda(client, bodaId);
  if (!boda) {
    throw new Error("Boda no encontrada.");
  }

  const fecha = normalizeBodaFecha(boda.fecha_boda);

  if (boda.google_event_id_fecha) {
    await deleteCalendarEventIfExists(boda.google_event_id_fecha);
  }

  const event = await createBodaFechaConfirmadaEvent(fecha, boda.nombre_pareja);

  const { error: updateError } = await client
    .from("bodas")
    .update({
      fecha_confirmada: true,
      google_event_id_fecha: event.eventId,
      fecha_boda_confirmada: fecha,
    })
    .eq("id", bodaId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { googleEventId: event.eventId };
}

async function desconfirmarFechaBoda(
  client: SupabaseClient,
  bodaId: string,
): Promise<void> {
  const boda = await fetchBoda(client, bodaId);
  if (!boda) {
    throw new Error("Boda no encontrada.");
  }

  await deleteCalendarEventIfExists(boda.google_event_id_fecha);

  const { error: updateError } = await client
    .from("bodas")
    .update({
      fecha_confirmada: false,
      google_event_id_fecha: null,
      fecha_boda_confirmada: null,
    })
    .eq("id", bodaId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentAuthUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!canConfirmBodaFecha(user.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  let confirm = true;
  try {
    const body = (await request.json()) as { confirm?: boolean };
    if (body.confirm === false) {
      confirm = false;
    }
  } catch {
    // confirmar por defecto
  }

  try {
    const supabase = await createServerSupabaseClient();

    if (confirm) {
      const result = await confirmarFechaBoda(supabase, id);
      return NextResponse.json({
        ok: true,
        fecha_confirmada: true,
        google_event_id_fecha: result.googleEventId,
      });
    }

    await desconfirmarFechaBoda(supabase, id);
    return NextResponse.json({
      ok: true,
      fecha_confirmada: false,
      google_event_id_fecha: null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la confirmación de fecha.",
      },
      { status: 500 },
    );
  }
}
