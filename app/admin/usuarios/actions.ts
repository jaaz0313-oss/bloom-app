"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { UserRole } from "@/lib/auth/roles";
import { toInternalEmail } from "@/lib/auth/internal-email";

const VALID_ROLES = new Set<UserRole>([
  "admin",
  "lider",
  "coordinadora",
  "finanzas",
]);

export async function createUserAction(formData: FormData) {
  await requireAdminUser();

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const rol = String(formData.get("rol") ?? "").trim() as UserRole;
  const password = String(formData.get("password") ?? "");

  if (!username || !nombre || !VALID_ROLES.has(rol) || password.length < 8) {
    throw new Error("Datos inválidos para crear usuario.");
  }

  const { data: authUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });

  if (createError || !authUser.user) {
    throw new Error(createError?.message || "No se pudo crear el usuario.");
  }

  const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
    id: authUser.user.id,
    username,
    nombre,
    telefono,
    rol,
    activo: true,
  });

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/admin/usuarios");
}

export async function updateUserAction(formData: FormData) {
  await requireAdminUser();

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const rol = String(formData.get("rol") ?? "").trim() as UserRole;
  const password = String(formData.get("password") ?? "").trim();

  if (!id || !nombre || !VALID_ROLES.has(rol)) {
    throw new Error("Datos inválidos para actualizar usuario.");
  }

  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .update({ nombre, telefono, rol })
    .eq("id", id);

  if (profileError) throw new Error(profileError.message);

  if (password) {
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { password },
    );
    if (passwordError) throw new Error(passwordError.message);
  }

  revalidatePath("/admin/usuarios");
}

export async function setUserActiveAction(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) throw new Error("Usuario inválido.");

  const { error } = await supabaseAdmin
    .from("user_profiles")
    .update({ activo: active })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/usuarios");
}
