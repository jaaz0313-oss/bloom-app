alter table public.bodas
  add column if not exists fecha_confirmada boolean default false;

alter table public.bodas
  add column if not exists google_event_id_fecha text;

alter table public.bodas
  add column if not exists fecha_boda_confirmada date;
