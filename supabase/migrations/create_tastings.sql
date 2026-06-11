-- Semana de Tastings por boda

create table if not exists public.tastings (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  proveedor_id uuid references public.directorio_proveedores(id),
  nombre_proveedor text not null,
  categoria text,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time,
  direccion text,
  costo numeric default 0,
  costo_pagado boolean default false,
  asignado_a uuid references auth.users(id),
  asignado_nombre text,
  confirmado boolean default false,
  notas text,
  google_event_id text,
  created_at timestamptz not null default now()
);

create index if not exists tastings_boda_id_idx on public.tastings (boda_id);
create index if not exists tastings_fecha_idx on public.tastings (fecha, hora_inicio);
create index if not exists tastings_asignado_fecha_idx on public.tastings (asignado_a, fecha);

alter table public.tastings enable row level security;

drop policy if exists "Auth users" on public.tastings;
create policy "Auth users"
  on public.tastings for all to authenticated using (true) with check (true);

drop policy if exists "allow select tastings anon" on public.tastings;
create policy "allow select tastings anon"
  on public.tastings for select to anon using (true);
