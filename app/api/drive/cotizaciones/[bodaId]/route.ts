import { NextResponse } from "next/server";
import { getCurrentAuthUser } from "@/lib/auth/user-profiles";
import { hasPermission } from "@/lib/auth/roles";
import { uploadFileToCotizacionesFolder } from "@/lib/google-drive";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ bodaId: string }>;
};

const MAX_FILE_BYTES = 500 * 1024;

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!hasPermission(user.rol, "providers.manage")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { bodaId } = await context.params;
  const id = bodaId?.trim();

  if (!id) {
    return NextResponse.json({ error: "Falta bodaId" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  const proveedorId = String(formData.get("proveedorId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  if (!proveedorId) {
    return NextResponse.json({ error: "Falta proveedorId" }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "El archivo no puede superar 500 KB" },
      { status: 413 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: proveedor, error: proveedorError } = await supabase
      .from("proveedores")
      .select("id, boda_id, nombre")
      .eq("id", proveedorId)
      .maybeSingle();

    if (proveedorError) {
      throw new Error(proveedorError.message);
    }

    if (!proveedor || proveedor.boda_id !== id) {
      return NextResponse.json(
        { error: "Proveedor no encontrado en esta boda" },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const driveFileName = `${proveedor.nombre} - ${file.name}`;
    const { fileUrl } = await uploadFileToCotizacionesFolder(
      id,
      driveFileName,
      file.type || "application/octet-stream",
      buffer,
    );

    const { error: updateError } = await supabase
      .from("proveedores")
      .update({ cotizacion_drive_url: fileUrl })
      .eq("id", proveedorId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ file_url: fileUrl });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "NO_DRIVE_FOLDER") {
      return NextResponse.json(
        { error: "NO_DRIVE_FOLDER" },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return NextResponse.json(
        { error: "El archivo no puede superar 500 KB" },
        { status: 413 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo subir la cotización.",
      },
      { status: 500 },
    );
  }
}
