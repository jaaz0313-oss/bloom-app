-- Ejecutar en el SQL Editor de Supabase si la tabla aún no existe.

create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  nombre text not null,
  categoria text not null,
  valor_total numeric(12, 2) not null default 0 check (valor_total >= 0),
  anticipo numeric(12, 2) not null default 0 check (anticipo >= 0),
  fecha_saldo date,
  banco text,
  numero_cuenta text,
  tipo_cuenta text,
  titular_cuenta text,
  link_pago text,
  descripcion_servicio text,
  notas text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'en_negociacion', 'contratado')),
  created_at timestamptz not null default now()
);

create index if not exists proveedores_boda_id_idx on public.proveedores (boda_id);

alter table public.proveedores enable row level security;

drop policy if exists "anon select proveedores" on public.proveedores;
create policy "anon select proveedores"
  on public.proveedores for select to anon, authenticated using (true);

drop policy if exists "anon insert proveedores" on public.proveedores;
create policy "anon insert proveedores"
  on public.proveedores for insert to anon, authenticated with check (true);

drop policy if exists "anon update proveedores" on public.proveedores;
create policy "anon update proveedores"
  on public.proveedores for update to anon, authenticated
  using (true) with check (true);

-- Para sincronizar proveedores_contratados en el dashboard:
drop policy if exists "anon update bodas" on public.bodas;
create policy "anon update bodas"
  on public.bodas for update to anon, authenticated
  using (true) with check (true);
