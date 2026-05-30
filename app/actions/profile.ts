"use server";

import { revalidatePath } from "next/cache";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function updateOwnTelefonoAction(formData: FormData) {
  const user = await requireAuthUser();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ telefono })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
