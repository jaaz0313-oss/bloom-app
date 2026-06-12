-- Proveedores sugeridos por boda y selección del cliente

create table if not exists public.proveedores_sugeridos (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  directorio_proveedor_id uuid references public.directorio_proveedores(id),
  nombre_proveedor text not null,
  categoria text not null,
  instagram text,
  ronda int not null default 1,
  orden int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists proveedores_sugeridos_boda_id_idx
  on public.proveedores_sugeridos (boda_id);
create index if not exists proveedores_sugeridos_boda_ronda_idx
  on public.proveedores_sugeridos (boda_id, ronda, categoria, orden);

alter table public.proveedores_sugeridos enable row level security;

drop policy if exists "Auth users" on public.proveedores_sugeridos;
create policy "Auth users"
  on public.proveedores_sugeridos for all to authenticated using (true) with check (true);

drop policy if exists "Public read" on public.proveedores_sugeridos;
create policy "Public read"
  on public.proveedores_sugeridos for select to anon using (true);

create table if not exists public.proveedores_sugeridos_seleccion (
  id uuid primary key default gen_random_uuid(),
  proveedor_sugerido_id uuid not null references public.proveedores_sugeridos(id) on delete cascade,
  boda_id uuid not null references public.bodas(id) on delete cascade,
  seleccionado boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists proveedores_sugeridos_seleccion_proveedor_idx
  on public.proveedores_sugeridos_seleccion (proveedor_sugerido_id);
create index if not exists proveedores_sugeridos_seleccion_boda_idx
  on public.proveedores_sugeridos_seleccion (boda_id);

alter table public.proveedores_sugeridos_seleccion enable row level security;

drop policy if exists "Public access" on public.proveedores_sugeridos_seleccion;
create policy "Public access"
  on public.proveedores_sugeridos_seleccion for all using (true) with check (true);
