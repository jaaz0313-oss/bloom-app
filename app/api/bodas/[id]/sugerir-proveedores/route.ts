import { NextResponse } from "next/server";
import { fetchProveedoresSugeridosForBoda } from "@/app/data/proveedores-sugeridos";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { hasPermission } from "@/lib/auth/roles";
import { fetchSugerenciasAutomaticasParaBoda } from "@/lib/proveedores-sugeridos-automaticos";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!hasPermission(user.rol, "providers.manage")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { id: bodaId } = await params;
    const supabase = await createServerSupabaseClient();

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

    const existingSugeridos = await fetchProveedoresSugeridosForBoda(
      supabase,
      bodaId,
    );
    const result = await fetchSugerenciasAutomaticasParaBoda(
      supabase,
      bodaId,
      existingSugeridos,
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron generar las sugerencias automáticas.",
      },
      { status: 500 },
    );
  }
}
