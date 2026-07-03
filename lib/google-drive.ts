import { google } from "googleapis";
import { Readable } from "stream";
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
  "infocelestia@gmail.com",
  "contabilidadcelestia@gmail.com",
] as const;

export const COMPROBANTES_PAGO_SUBFOLDER = "Comprobantes de pago";
export const COTIZACIONES_SUBFOLDER = "Cotizaciones";

const MAX_DRIVE_UPLOAD_BYTES = 500 * 1024;

function getDriveClient() {
  const { email, key } = getGoogleServiceAccountCredentials();

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

async function shareFolderWithLink(drive: ReturnType<typeof getDriveClient>, fileId: string) {
  await drive.permissions.create({
    fileId,
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
      if (!isDrivePermissionAlreadyExistsError(error)) {
        console.error(
          `No se pudo compartir la carpeta ${fileId} con ${emailAddress}:`,
          error,
        );
      }
    }
  }
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

function buildDriveFileUrl(fileId: string, webViewLink?: string | null) {
  return webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;
}

function sanitizeDriveFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

async function uploadFileToDriveFolder(
  parentFolderId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<{ fileId: string; fileUrl: string }> {
  if (content.byteLength > MAX_DRIVE_UPLOAD_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const drive = getDriveClient();
  const result = await drive.files.create({
    requestBody: {
      name: sanitizeDriveFileName(fileName),
      parents: [parentFolderId],
    },
    media: {
      mimeType: mimeType || "application/octet-stream",
      body: Readable.from(content),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = result.data.id;
  if (!fileId) {
    throw new Error("Google Drive no devolvió el ID del archivo.");
  }

  await configureFolderSharing(drive, fileId);

  return {
    fileId,
    fileUrl: buildDriveFileUrl(fileId, result.data.webViewLink),
  };
}

export async function getCotizacionesFolderId(
  bodaId: string,
): Promise<string | null> {
  const folder = await getDriveFolderForBoda(bodaId);
  if (!folder?.drive_folder_id) return null;

  const subfolder = await findDriveSubfolder(
    folder.drive_folder_id,
    COTIZACIONES_SUBFOLDER,
  );

  return subfolder?.id ?? null;
}

export async function uploadFileToCotizacionesFolder(
  bodaId: string,
  fileName: string,
  mimeType: string,
  content: Buffer,
): Promise<{ fileId: string; fileUrl: string }> {
  const folderId = await getCotizacionesFolderId(bodaId);
  if (!folderId) {
    throw new Error("NO_DRIVE_FOLDER");
  }

  return uploadFileToDriveFolder(folderId, fileName, mimeType, content);
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
