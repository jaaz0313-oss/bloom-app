import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createGoogleOAuthClient } from "@/lib/google-oauth";

export type GoogleTokensRow = {
  google_access_token: string | null;
  google_refresh_token: string | null;
};

export type BodaDriveFolderRow = {
  id: string;
  boda_id: string;
  drive_folder_id: string;
  folder_name: string | null;
  folder_url: string | null;
  created_by: string | null;
  created_at: string;
};

export async function getGoogleTokensForUser(
  userId: string,
): Promise<GoogleTokensRow | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("google_access_token, google_refresh_token")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as GoogleTokensRow | null) ?? null;
}

export async function saveGoogleTokensForUser(
  userId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
  },
) {
  const update: Record<string, string | null> = {};

  if (tokens.access_token) {
    update.google_access_token = tokens.access_token;
  }
  if (tokens.refresh_token) {
    update.google_refresh_token = tokens.refresh_token;
  }

  if (Object.keys(update).length === 0) {
    throw new Error("Google no devolvió tokens válidos.");
  }

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update(update)
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function getGoogleDriveClientForUser(userId: string) {
  const tokens = await getGoogleTokensForUser(userId);

  if (!tokens?.google_access_token) {
    throw new Error(
      "Google Drive no está conectado. Inicia sesión con Google primero.",
    );
  }

  const oauth2Client = createGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.google_access_token,
    refresh_token: tokens.google_refresh_token ?? undefined,
  });

  oauth2Client.on("tokens", async (refreshed) => {
    const update: Record<string, string> = {};
    if (refreshed.access_token) {
      update.google_access_token = refreshed.access_token;
    }
    if (refreshed.refresh_token) {
      update.google_refresh_token = refreshed.refresh_token;
    }
    if (Object.keys(update).length === 0) return;

    await supabaseAdmin.from("user_profiles").update(update).eq("id", userId);
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function createDriveFolderForBoda(params: {
  userId: string;
  bodaId: string;
  nombrePareja: string;
}) {
  const existing = await getDriveFolderForBoda(params.bodaId);
  if (existing?.folder_url) {
    return existing;
  }

  const drive = await getGoogleDriveClientForUser(params.userId);
  const folderName = `Boda - ${params.nombrePareja.trim() || "Sin nombre"}`;

  const mainFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name, webViewLink",
  });

  const parentId = mainFolder.data.id;
  if (!parentId) {
    throw new Error("Google Drive no devolvió el ID de la carpeta principal.");
  }

  const subfolders = ["Cotizaciones", "Comprobantes de pago", "Contratos"];
  for (const subfolderName of subfolders) {
    await drive.files.create({
      requestBody: {
        name: subfolderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from("boda_drive_folders")
    .upsert(
      {
        boda_id: params.bodaId,
        drive_folder_id: parentId,
        folder_name: mainFolder.data.name ?? folderName,
        folder_url: mainFolder.data.webViewLink ?? null,
        created_by: params.userId,
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

export function userHasGoogleDriveConnected(
  tokens: GoogleTokensRow | null,
): boolean {
  return Boolean(tokens?.google_access_token);
}
