import { NextResponse } from "next/server";
import {
  detallesCelebracionFormToPayload,
  type DetallesCelebracionRow,
} from "@/app/data/detalles-celebracion";
import { parseDetallesCelebracionBody } from "@/lib/detalles-celebracion";
import {
  getClientePinFromTelefonoNovia,
  verifyClientePin,
} from "@/lib/cliente-pin";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: bodaId } = await params;
    const body = await request.json();
    const clientePin =
      typeof body?.clientePin === "string" ? body.clientePin : "";
    const form = parseDetallesCelebracionBody(body);

    if (!form) {
      return NextResponse.json(
        { error: "Datos de celebración inválidos." },
        { status: 400 },
      );
    }

    const supabase = createPublicSupabaseClient();

    const { data: boda, error: bodaError } = await supabase
      .from("bodas")
      .select("id, telefono_novia")
      .eq("id", bodaId)
      .maybeSingle();

    if (bodaError) {
      console.error(bodaError);
      return NextResponse.json(
        { error: "No se pudo verificar la boda." },
        { status: 500 },
      );
    }

    if (!boda) {
      return NextResponse.json({ error: "Boda no encontrada." }, { status: 404 });
    }

    const telefonoNovia = (boda as { telefono_novia: string | null })
      .telefono_novia;
    if (
      getClientePinFromTelefonoNovia(telefonoNovia) &&
      !verifyClientePin(clientePin, telefonoNovia)
    ) {
      return NextResponse.json(
        { error: "PIN incorrecto, inténtalo de nuevo" },
        { status: 403 },
      );
    }

    const payload = detallesCelebracionFormToPayload(form);

    const { data, error } = await supabase
      .from("detalles_celebracion")
      .upsert(
        {
          boda_id: bodaId,
          ...payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "boda_id" },
      )
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudieron guardar los detalles de celebración." },
        { status: 500 },
      );
    }

    return NextResponse.json({ detalles: data as DetallesCelebracionRow });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar los detalles de celebración.",
      },
      { status: 500 },
    );
  }
}
