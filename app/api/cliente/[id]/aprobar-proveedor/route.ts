import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Aprobación pública desde el portal del cliente. Sin sesión. */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: bodaId } = await params;
    const body = (await request.json().catch(() => null)) as {
      proveedorId?: string;
    } | null;
    const proveedorId = body?.proveedorId?.trim() ?? "";

    if (!proveedorId) {
      return NextResponse.json(
        { error: "Falta el proveedor a aprobar." },
        { status: 400 },
      );
    }

    const supabase = createPublicSupabaseClient();

    const { data: proveedor, error: proveedorError } = await supabase
      .from("proveedores")
      .select("id, boda_id, estado, nombre")
      .eq("id", proveedorId)
      .eq("boda_id", bodaId)
      .maybeSingle();

    if (proveedorError) {
      throw proveedorError;
    }

    if (!proveedor) {
      return NextResponse.json(
        { error: "Proveedor no encontrado en esta boda." },
        { status: 404 },
      );
    }

    if (proveedor.estado !== "en_negociacion") {
      return NextResponse.json(
        { error: "Solo se pueden aprobar proveedores en evaluación." },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("aprobaciones_cliente")
      .select("id, estado")
      .eq("proveedor_id", proveedorId)
      .eq("estado", "pendiente")
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        aprobacionId: existing.id,
        alreadyApproved: true,
      });
    }

    const { data: created, error: insertError } = await supabase
      .from("aprobaciones_cliente")
      .insert({
        boda_id: bodaId,
        proveedor_id: proveedorId,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      ok: true,
      aprobacionId: created.id,
      alreadyApproved: false,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la aprobación.",
      },
      { status: 500 },
    );
  }
}
