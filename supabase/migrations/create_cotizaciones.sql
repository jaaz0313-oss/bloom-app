-- Cotizaciones para leads

create table if not exists public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  numero_invitados int,
  ciudad text,
  fecha_estimada date,
  notas text,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviada', 'aceptada', 'rechazada')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones(id) on delete cascade,
  categoria text not null,
  descripcion text,
  precio_estimado numeric(12, 2),
  proveedor_sugerido_id uuid references public.directorio_proveedores(id),
  notas_internas text,
  incluido boolean not null default true
);

create index if not exists cotizaciones_lead_id_idx on public.cotizaciones (lead_id);
create index if not exists cotizacion_items_cotizacion_id_idx on public.cotizacion_items (cotizacion_id);

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

drop policy if exists "Auth users" on public.cotizaciones;
create policy "Auth users"
  on public.cotizaciones for all to authenticated using (true) with check (true);

drop policy if exists "Auth users" on public.cotizacion_items;
create policy "Auth users"
  on public.cotizacion_items for all to authenticated using (true) with check (true);

drop policy if exists "allow all cotizaciones anon" on public.cotizaciones;
create policy "allow all cotizaciones anon"
  on public.cotizaciones for all to anon using (true) with check (true);

drop policy if exists "allow all cotizacion_items anon" on public.cotizacion_items;
create policy "allow all cotizacion_items anon"
  on public.cotizacion_items for all to anon using (true) with check (true);
