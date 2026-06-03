-- Tokens OAuth de Google Drive por usuario del equipo

alter table public.user_profiles
  add column if not exists google_access_token text;

alter table public.user_profiles
  add column if not exists google_refresh_token text;
