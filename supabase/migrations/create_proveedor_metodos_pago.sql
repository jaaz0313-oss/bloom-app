-- Múltiples métodos/cuentas de pago por proveedor de boda.
-- Las columnas banco/tipo_cuenta/numero_cuenta/titular_cuenta/documento_nit
-- en `proveedores` siguen existiendo como espejo del método con es_principal = true.

create table if not exists public.proveedor_metodos_pago (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.proveedores(id) on delete cascade,
  tipo text not null,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  titular text,
  documento_titular text,
  recargo_porcentaje numeric,
  notas text,
  es_principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists proveedor_metodos_pago_proveedor_id_idx
  on public.proveedor_metodos_pago (proveedor_id);

create index if not exists proveedor_metodos_pago_principal_idx
  on public.proveedor_metodos_pago (proveedor_id, es_principal)
  where es_principal = true;

alter table public.proveedor_metodos_pago enable row level security;

drop policy if exists "Auth users" on public.proveedor_metodos_pago;
create policy "Auth users"
  on public.proveedor_metodos_pago for all to authenticated
  using (true) with check (true);

drop policy if exists "allow all proveedor_metodos_pago anon"
  on public.proveedor_metodos_pago;
create policy "allow all proveedor_metodos_pago anon"
  on public.proveedor_metodos_pago for all to anon
  using (true) with check (true);

-- Migrar datos existentes (un método principal por proveedor con datos bancarios).
insert into public.proveedor_metodos_pago (
  proveedor_id,
  tipo,
  banco,
  tipo_cuenta,
  numero_cuenta,
  titular,
  documento_titular,
  es_principal
)
select
  p.id,
  'Transferencia bancaria',
  nullif(trim(p.banco), ''),
  nullif(trim(p.tipo_cuenta), ''),
  nullif(trim(p.numero_cuenta), ''),
  nullif(trim(p.titular_cuenta), ''),
  nullif(trim(p.documento_nit), ''),
  true
from public.proveedores p
where
  (
    coalesce(nullif(trim(p.banco), ''), '') <> ''
    or coalesce(nullif(trim(p.tipo_cuenta), ''), '') <> ''
    or coalesce(nullif(trim(p.numero_cuenta), ''), '') <> ''
    or coalesce(nullif(trim(p.titular_cuenta), ''), '') <> ''
    or coalesce(nullif(trim(p.documento_nit), ''), '') <> ''
  )
  and not exists (
    select 1
    from public.proveedor_metodos_pago m
    where m.proveedor_id = p.id
  );
