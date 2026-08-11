create table if not exists public.aprobaciones_cliente (
  id uuid default gen_random_uuid() primary key,
  boda_id uuid references public.bodas(id) on delete cascade,
  proveedor_id uuid references public.proveedores(id) on delete cascade,
  estado text default 'pendiente',
  created_at timestamptz default now()
);

create index if not exists aprobaciones_cliente_boda_estado_idx
  on public.aprobaciones_cliente (boda_id, estado);

create index if not exists aprobaciones_cliente_proveedor_idx
  on public.aprobaciones_cliente (proveedor_id);

alter table public.aprobaciones_cliente enable row level security;

drop policy if exists "Allow all" on public.aprobaciones_cliente;
create policy "Allow all"
  on public.aprobaciones_cliente
  for all
  using (true)
  with check (true);
