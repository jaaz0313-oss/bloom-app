alter table public.citas
  add column if not exists notas_reunion jsonb default '[]'::jsonb;
