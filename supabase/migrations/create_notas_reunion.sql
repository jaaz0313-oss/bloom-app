-- Notas de reunión por boda (cliente, proveedor o equipo)

create table if not exists public.notas_reunion (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  fecha timestamptz not null default now(),
  con_quien text not null,
  resumen text not null,
  creado_por uuid references auth.users(id),
  creado_por_nombre text,
  created_at timestamptz not null default now()
);

create index if not exists notas_reunion_boda_id_idx on public.notas_reunion (boda_id);
create index if not exists notas_reunion_fecha_idx on public.notas_reunion (fecha desc);

alter table public.notas_reunion enable row level security;

drop policy if exists "Auth users" on public.notas_reunion;
create policy "Auth users"
  on public.notas_reunion for all to authenticated using (true) with check (true);

drop policy if exists "allow all notas_reunion anon" on public.notas_reunion;
create policy "allow all notas_reunion anon"
  on public.notas_reunion for all to anon using (true) with check (true);
