import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { google } from "googleapis";
import { getGoogleServiceAccountCredentials } from "@/lib/google-service-account";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TIMING_DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

export const COMPROBANTES_PAGO_SUBFOLDER = "Comprobantes de pago";

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

export async function uploadTimingTemplate(
  bodaFolderId: string,
  bodaNombre: string,
): Promise<void> {
  try {
    console.log("Intentando subir timing template para:", bodaNombre);
    console.log(
      "Leyendo archivo desde:",
      path.join(process.cwd(), "public", "plantilla-timing.docx"),
    );

    const drive = getDriveClient();
    const templatePath = path.join(
      process.cwd(),
      "public",
      "plantilla-timing.docx",
    );
    const fileBuffer = fs.readFileSync(templatePath);
    console.log("Archivo leído, tamaño:", fileBuffer.length, "bytes");

    const fileName = `Timing - ${bodaNombre.trim() || "Sin nombre"}.docx`;

    const result = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [bodaFolderId],
        mimeType: TIMING_DOCX_MIME,
      },
      media: {
        mimeType: TIMING_DOCX_MIME,
        body: Readable.from(fileBuffer),
      },
      fields: "id",
    });

    console.log("Archivo subido exitosamente:", result.data.id);
  } catch (error) {
    console.error("Error subiendo timing template:", error);
    throw error;
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

  await shareFolderWithLink(drive, parentId);

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
      await shareFolderWithLink(drive, subfolder.data.id);
    }
  }

  try {
    await uploadTimingTemplate(parentId, bodaNombre);
  } catch (error) {
    console.error("No se pudo subir la plantilla de timing a Drive:", error);
  }

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

async function findDriveSubfolderUrl(
  parentFolderId: string,
  subfolderName: string,
): Promise<string | null> {
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

  return buildDriveFolderUrl(subfolder.id, subfolder.webViewLink);
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
