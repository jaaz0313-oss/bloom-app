-- Email de contacto en perfil de usuario (invites, Meet, etc.)

alter table public.user_profiles
  add column if not exists email text;
