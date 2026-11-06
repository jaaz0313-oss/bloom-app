-- Enlace para abrir a mano el evento de Google de una cita.

alter table public.citas
  add column if not exists google_event_link text;
