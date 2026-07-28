-- Link de Google Meet generado al sincronizar con Calendar

alter table public.citas
  add column if not exists google_meet_link text;

alter table public.tastings
  add column if not exists google_meet_link text;
