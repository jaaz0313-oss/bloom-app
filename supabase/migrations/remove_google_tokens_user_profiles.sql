-- OAuth de usuario ya no se usa; Drive usa Service Account

alter table public.user_profiles
  drop column if exists google_access_token;

alter table public.user_profiles
  drop column if exists google_refresh_token;
