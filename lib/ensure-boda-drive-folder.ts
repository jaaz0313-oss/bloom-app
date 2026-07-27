/** Mensaje discreto cuando la boda se crea pero Drive falla. */
export const DRIVE_FOLDER_CREATE_WARNING =
  "La boda fue creada pero hubo un error al crear la carpeta de Drive. Puedes crearla manualmente desde el detalle de la boda.";

/**
 * Crea la carpeta de Drive de una boda vía API (usa `createDriveFolderForBoda`
 * en el servidor y persiste en `boda_drive_folders`).
 */
export async function ensureBodaDriveFolder(
  bodaId: string,
): Promise<{ ok: true; folderUrl: string } | { ok: false }> {
  try {
    const response = await fetch("/api/drive/crear-carpeta-boda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodaId }),
    });

    const data = (await response.json()) as {
      folder_url?: string;
      error?: string;
    };

    if (!response.ok || !data.folder_url) {
      console.error(
        "[ensureBodaDriveFolder]",
        data.error ?? `HTTP ${response.status}`,
      );
      return { ok: false };
    }

    return { ok: true, folderUrl: data.folder_url };
  } catch (error) {
    console.error("[ensureBodaDriveFolder]", error);
    return { ok: false };
  }
}
