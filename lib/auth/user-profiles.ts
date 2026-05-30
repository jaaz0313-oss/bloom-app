import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getPermissionsForRole, type Permission, type UserRole } from "./roles";
import { toInternalEmail } from "./internal-email";

export type UserProfile = {
  id: string;
  username: string;
  nombre: string;
  telefono: string | null;
  rol: UserRole;
  activo: boolean;
};

export type AuthUser = {
  id: string;
  username: string;
  nombre: string;
  telefono: string | null;
  rol: UserRole;
  permissions: Permission[];
};

export const getCurrentAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, nombre, telefono, rol, activo")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !data || !data.activo) return null;

  const profile = data as UserProfile;
  return {
    id: profile.id,
    username: profile.username,
    nombre: profile.nombre,
    telefono: profile.telefono ?? null,
    rol: profile.rol,
    permissions: getPermissionsForRole(profile.rol),
  };
});

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentAuthUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.rol !== "admin") redirect("/");
  return user;
}
