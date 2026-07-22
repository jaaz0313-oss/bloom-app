import { google } from "googleapis";
import { getGoogleServiceAccountCredentials } from "@/lib/google-service-account";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type BodaDriveFolderRow = {
  id: string;
  boda_id: string;
  drive_folder_id: string;
  folder_name: string | null;
  folder_url: string | null;
  created_by: string | null;
  created_at: string;
};

const SUBFOLDERS = ["Cotizaciones", "Comprobantes de pago", "Contratos"];

export const BODA_DRIVE_TEAM_WRITER_EMAILS = [
  "infocelestiaevents@gmail.com",
  "contabilidadcelestia@gmail.com",
] as const;

export const COMPROBANTES_PAGO_SUBFOLDER = "Comprobantes de pago";
export const COTIZACIONES_SUBFOLDER = "Cotizaciones";

function getDriveClient() {
  const { email, key } = getGoogleServiceAccountCredentials();

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

async function shareFolderWithLink(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string,
) {
  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });
}

function isDrivePermissionAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("already exists") ||
    message.includes("already has access") ||
    message.includes("409")
  );
}

async function shareFolderWithTeamWriters(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string,
) {
  for (const emailAddress of BODA_DRIVE_TEAM_WRITER_EMAILS) {
    try {
      await shareFolderWithWriter(drive, fileId, emailAddress);
    } catch (error) {
      console.error(
        `No se pudo compartir la carpeta ${fileId} con ${emailAddress}:`,
        error,
      );
    }
  }
}

async function shareFolderWithWriter(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string,
  emailAddress: string,
) {
  try {
    await drive.permissions.create({
      fileId,
      sendNotificationEmail: false,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress,
      },
    });
  } catch (error) {
    if (isDrivePermissionAlreadyExistsError(error)) {
      return;
    }
    throw error;
  }
}

async function listChildFolders(
  drive: ReturnType<typeof getDriveClient>,
  parentFolderId: string,
): Promise<Array<{ id: string; name: string | null }>> {
  const { data } = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (data.files ?? [])
    .filter((file): file is { id: string; name?: string | null } =>
      Boolean(file.id),
    )
    .map((file) => ({
      id: file.id,
      name: file.name ?? null,
    }));
}

export type DriveShareFolderResult = {
  folderId: string;
  folderName: string | null;
  bodaId: string;
  kind: "principal" | "subcarpeta";
  ok: boolean;
  error?: string;
};

export type ShareRegisteredFoldersSummary = {
  email: string;
  total: number;
  shared: number;
  failed: number;
  results: DriveShareFolderResult[];
};

/** Comparte todas las carpetas registradas (y subcarpetas hijas) con un writer. */
export async function shareAllRegisteredFoldersWithWriter(
  emailAddress: string,
): Promise<ShareRegisteredFoldersSummary> {
  const drive = getDriveClient();
  const { data, error } = await supabaseAdmin
    .from("boda_drive_folders")
    .select("boda_id, drive_folder_id, folder_name")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const folders = (data ?? []) as Array<{
    boda_id: string;
    drive_folder_id: string;
    folder_name: string | null;
  }>;

  const results: DriveShareFolderResult[] = [];

  for (const folder of folders) {
    try {
      await shareFolderWithWriter(drive, folder.drive_folder_id, emailAddress);
      results.push({
        folderId: folder.drive_folder_id,
        folderName: folder.folder_name,
        bodaId: folder.boda_id,
        kind: "principal",
        ok: true,
      });
    } catch (shareError) {
      results.push({
        folderId: folder.drive_folder_id,
        folderName: folder.folder_name,
        bodaId: folder.boda_id,
        kind: "principal",
        ok: false,
        error:
          shareError instanceof Error
            ? shareError.message
            : "Error desconocido al compartir",
      });
      continue;
    }

    try {
      const children = await listChildFolders(drive, folder.drive_folder_id);
      for (const child of children) {
        try {
          await shareFolderWithWriter(drive, child.id, emailAddress);
          results.push({
            folderId: child.id,
            folderName: child.name,
            bodaId: folder.boda_id,
            kind: "subcarpeta",
            ok: true,
          });
        } catch (childError) {
          results.push({
            folderId: child.id,
            folderName: child.name,
            bodaId: folder.boda_id,
            kind: "subcarpeta",
            ok: false,
            error:
              childError instanceof Error
                ? childError.message
                : "Error desconocido al compartir subcarpeta",
          });
        }
      }
    } catch (listError) {
      results.push({
        folderId: folder.drive_folder_id,
        folderName: folder.folder_name
          ? `${folder.folder_name} (subcarpetas)`
          : "Subcarpetas",
        bodaId: folder.boda_id,
        kind: "subcarpeta",
        ok: false,
        error:
          listError instanceof Error
            ? listError.message
            : "No se pudieron listar las subcarpetas",
      });
    }
  }

  const shared = results.filter((result) => result.ok).length;
  const failed = results.length - shared;

  return {
    email: emailAddress,
    total: results.length,
    shared,
    failed,
    results,
  };
}

async function configureFolderSharing(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string,
) {
  await shareFolderWithLink(drive, fileId);
  await shareFolderWithTeamWriters(drive, fileId);
}

export async function copyTimingTemplate(
  bodaFolderId: string,
  bodaNombre: string,
): Promise<void> {
  console.log(
    "GOOGLE_TIMING_TEMPLATE_ID:",
    process.env.GOOGLE_TIMING_TEMPLATE_ID
      ? "definido: " + process.env.GOOGLE_TIMING_TEMPLATE_ID
      : "undefined",
  );

  const templateId = process.env.GOOGLE_TIMING_TEMPLATE_ID?.trim();

  if (!templateId) {
    console.error(
      "GOOGLE_TIMING_TEMPLATE_ID no está definido; se omite la copia del timing.",
    );
    return;
  }

  try {
    const drive = getDriveClient();
    const fileName = `Timing - ${bodaNombre.trim() || "Sin nombre"}`;

    console.log("Intentando copiar timing a carpeta:", bodaFolderId);

    const result = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: fileName,
        parents: [bodaFolderId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    console.log("Resultado copy:", JSON.stringify(result.data));
  } catch (error) {
    console.error("Error copiando timing:", error);
  }
}

export async function createDriveFolderForBoda(
  bodaId: string,
  bodaNombre: string,
  createdBy?: string,
) {
  const existing = await getDriveFolderForBoda(bodaId);
  if (existing?.folder_url) {
    return existing;
  }

  const drive = getDriveClient();
  const folderName = `Boda - ${bodaNombre.trim() || "Sin nombre"}`;
  const parents = [process.env.GOOGLE_DRIVE_FOLDER_ID].filter(Boolean) as string[];

  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    ...(parents.length > 0 ? { parents } : {}),
  };

  const mainFolder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id, name, webViewLink",
  });

  const parentId = mainFolder.data.id;
  if (!parentId) {
    throw new Error("Google Drive no devolvió el ID de la carpeta principal.");
  }

  await configureFolderSharing(drive, parentId);

  for (const subfolderName of SUBFOLDERS) {
    const subfolder = await drive.files.create({
      requestBody: {
        name: subfolderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });

    if (subfolder.data.id) {
      await configureFolderSharing(drive, subfolder.data.id);
    }
  }

  await copyTimingTemplate(parentId, bodaNombre);

  const folderUrl =
    mainFolder.data.webViewLink ??
    `https://drive.google.com/drive/folders/${parentId}`;

  const { data, error } = await supabaseAdmin
    .from("boda_drive_folders")
    .upsert(
      {
        boda_id: bodaId,
        drive_folder_id: parentId,
        folder_name: mainFolder.data.name ?? folderName,
        folder_url: folderUrl,
        created_by: createdBy ?? null,
      },
      { onConflict: "boda_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BodaDriveFolderRow;
}

export async function getDriveFolderForBoda(
  bodaId: string,
): Promise<BodaDriveFolderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("boda_drive_folders")
    .select("*")
    .eq("boda_id", bodaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as BodaDriveFolderRow | null) ?? null;
}

function buildDriveFolderUrl(folderId: string, webViewLink?: string | null) {
  return webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
}

async function findDriveSubfolder(
  parentFolderId: string,
  subfolderName: string,
): Promise<{ id: string; url: string } | null> {
  const drive = getDriveClient();
  const escapedName = subfolderName.replace(/'/g, "\\'");
  const { data } = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`,
    fields: "files(id, webViewLink)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const subfolder = data.files?.[0];
  if (!subfolder?.id) return null;

  return {
    id: subfolder.id,
    url: buildDriveFolderUrl(subfolder.id, subfolder.webViewLink),
  };
}

async function findDriveSubfolderUrl(
  parentFolderId: string,
  subfolderName: string,
): Promise<string | null> {
  const subfolder = await findDriveSubfolder(parentFolderId, subfolderName);
  return subfolder?.url ?? null;
}

export async function getCotizacionesFolderUrl(
  bodaId: string,
): Promise<string | null> {
  const folder = await getDriveFolderForBoda(bodaId);
  if (!folder?.drive_folder_id) return null;

  const subfolderUrl = await findDriveSubfolderUrl(
    folder.drive_folder_id,
    COTIZACIONES_SUBFOLDER,
  );

  return (
    subfolderUrl ??
    folder.folder_url ??
    buildDriveFolderUrl(folder.drive_folder_id)
  );
}

export async function getComprobantesPagoFolderUrl(
  bodaId: string,
): Promise<string | null> {
  const folder = await getDriveFolderForBoda(bodaId);
  if (!folder?.drive_folder_id) return null;

  const subfolderUrl = await findDriveSubfolderUrl(
    folder.drive_folder_id,
    COMPROBANTES_PAGO_SUBFOLDER,
  );

  return (
    subfolderUrl ??
    folder.folder_url ??
    buildDriveFolderUrl(folder.drive_folder_id)
  );
}
