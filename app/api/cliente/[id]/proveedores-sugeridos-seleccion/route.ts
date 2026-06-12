import { NextResponse } from "next/server";
import type { ProveedorSugeridoSeleccionRow } from "@/app/data/proveedores-sugeridos";
import { parseProveedorSugeridoSeleccionBody } from "@/lib/proveedores-sugeridos";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: bodaId } = await params;
    const body = await request.json();
    const parsed = parseProveedorSugeridoSeleccionBody(body);

    if (!parsed) {
      return NextResponse.json(
        { error: "Datos de selección inválidos." },
        { status: 400 },
      );
    }

    const supabase = createPublicSupabaseClient();

    const { data: boda, error: bodaError } = await supabase
      .from("bodas")
      .select("id")
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

    const { data: sugerido, error: sugeridoError } = await supabase
      .from("proveedores_sugeridos")
      .select("id, boda_id")
      .eq("id", parsed.proveedor_sugerido_id)
      .maybeSingle();

    if (sugeridoError) {
      console.error(sugeridoError);
      return NextResponse.json(
        { error: "No se pudo verificar la sugerencia." },
        { status: 500 },
      );
    }

    if (!sugerido || sugerido.boda_id !== bodaId) {
      return NextResponse.json(
        { error: "Sugerencia no encontrada para esta boda." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("proveedores_sugeridos_seleccion")
      .upsert(
        {
          proveedor_sugerido_id: parsed.proveedor_sugerido_id,
          boda_id: bodaId,
          seleccionado: parsed.seleccionado,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "proveedor_sugerido_id" },
      )
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "No se pudo guardar la selección." },
        { status: 500 },
      );
    }

    return NextResponse.json({ seleccion: data as ProveedorSugeridoSeleccionRow });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la selección.",
      },
      { status: 500 },
    );
  }
}
