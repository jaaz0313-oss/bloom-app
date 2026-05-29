-- Notas internas del equipo por boda

create table if not exists public.notas_boda (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  contenido text not null,
  created_by uuid references auth.users(id),
  created_by_nombre text,
  created_at timestamptz not null default now()
);

create index if not exists notas_boda_boda_id_idx on public.notas_boda (boda_id);
create index if not exists notas_boda_created_at_idx on public.notas_boda (created_at desc);

alter table public.notas_boda enable row level security;

drop policy if exists "Auth users" on public.notas_boda;
create policy "Auth users"
  on public.notas_boda for all to authenticated using (true) with check (true);

drop policy if exists "allow all notas_boda anon" on public.notas_boda;
create policy "allow all notas_boda anon"
  on public.notas_boda for all to anon using (true) with check (true);
