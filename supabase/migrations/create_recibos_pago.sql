-- Recibos de pago (honorarios / pagos a Celestia), historial por boda
create table if not exists public.recibos_pago (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  fecha date not null,
  metodo_pago text not null,
  cuenta text,
  concepto text not null,
  valor numeric not null,
  total numeric not null,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviado', 'emitido')),
  created_by text,
  -- Snapshot del cliente al emitir (no se lee live de la boda al regenerar)
  cliente_nombre text not null,
  cliente_direccion text,
  cliente_ciudad text,
  cliente_telefono text,
  cliente_documento text,
  created_at timestamptz not null default now()
);

create index if not exists recibos_pago_boda_id_idx
  on public.recibos_pago (boda_id);

create index if not exists recibos_pago_boda_fecha_idx
  on public.recibos_pago (boda_id, fecha desc);

alter table public.recibos_pago enable row level security;

drop policy if exists "Auth users" on public.recibos_pago;
create policy "Auth users"
  on public.recibos_pago for all to authenticated using (true) with check (true);

drop policy if exists "allow all recibos_pago anon" on public.recibos_pago;
create policy "allow all recibos_pago anon"
  on public.recibos_pago for all to anon using (true) with check (true);
