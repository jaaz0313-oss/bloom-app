-- Sincronización con Google Calendar (Service Account)

alter table public.citas
  add column if not exists google_event_id text;

alter table public.citas
  add column if not exists google_meet_link text;
