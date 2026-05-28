import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Define NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para ejecutar el seed.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  { username: "jaime", nombre: "Jaime Aristizabal", rol: "admin" },
  { username: "luisa", nombre: "Luisa Bustamante", rol: "lider" },
  { username: "juliana", nombre: "Juliana", rol: "coordinadora" },
  { username: "natalia", nombre: "Natalia", rol: "finanzas" },
];

const defaultPassword = process.env.BLOOM_DEFAULT_USER_PASSWORD;
if (!defaultPassword) {
  throw new Error("Define BLOOM_DEFAULT_USER_PASSWORD para crear usuarios iniciales.");
}

for (const user of users) {
  const email = `${user.username}@bloom-app.internal`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { username: user.username },
  });

  if (error || !data.user) {
    console.error(`No se pudo crear ${user.username}:`, error?.message);
    continue;
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert({
    id: data.user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    activo: true,
  });

  if (profileError) {
    console.error(`No se pudo insertar perfil ${user.username}:`, profileError.message);
  } else {
    console.log(`Usuario creado: ${user.username}`);
  }
}
