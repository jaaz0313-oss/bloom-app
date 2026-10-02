-- Múltiples métodos/cuentas de pago por proveedor del directorio.
-- Las columnas banco/tipo_cuenta/numero_cuenta/titular/documento_nit
-- en `directorio_proveedores` siguen existiendo como espejo del método
-- con es_principal = true.

create table if not exists public.directorio_metodos_pago (
  id uuid primary key default gen_random_uuid(),
  directorio_proveedor_id uuid not null references public.directorio_proveedores(id) on delete cascade,
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

create index if not exists directorio_metodos_pago_proveedor_id_idx
  on public.directorio_metodos_pago (directorio_proveedor_id);

create index if not exists directorio_metodos_pago_principal_idx
  on public.directorio_metodos_pago (directorio_proveedor_id, es_principal)
  where es_principal = true;

alter table public.directorio_metodos_pago enable row level security;

drop policy if exists "Auth users" on public.directorio_metodos_pago;
create policy "Auth users"
  on public.directorio_metodos_pago for all to authenticated
  using (true) with check (true);

drop policy if exists "allow all directorio_metodos_pago anon"
  on public.directorio_metodos_pago;
create policy "allow all directorio_metodos_pago anon"
  on public.directorio_metodos_pago for all to anon
  using (true) with check (true);

-- Migrar datos existentes (un método principal por proveedor con datos bancarios).
insert into public.directorio_metodos_pago (
  directorio_proveedor_id,
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
  nullif(trim(p.titular), ''),
  nullif(trim(p.documento_nit), ''),
  true
from public.directorio_proveedores p
where
  (
    coalesce(nullif(trim(p.banco), ''), '') <> ''
    or coalesce(nullif(trim(p.tipo_cuenta), ''), '') <> ''
    or coalesce(nullif(trim(p.numero_cuenta), ''), '') <> ''
    or coalesce(nullif(trim(p.titular), ''), '') <> ''
    or coalesce(nullif(trim(p.documento_nit), ''), '') <> ''
  )
  and not exists (
    select 1
    from public.directorio_metodos_pago m
    where m.directorio_proveedor_id = p.id
  );
