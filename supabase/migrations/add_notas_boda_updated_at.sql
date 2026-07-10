alter table public.notas_boda
  add column if not exists updated_at timestamptz default now();

update public.notas_boda
set updated_at = created_at;

alter table public.notas_boda
  alter column updated_at set not null;
