-- Comisiones de proveedores

alter table public.proveedores
  add column if not exists da_comision boolean not null default false;

alter table public.proveedores
  add column if not exists porcentaje_comision numeric(5, 2) default 10;

alter table public.proveedores
  add column if not exists comision_recibida boolean not null default false;

alter table public.proveedores
  add column if not exists comision_recibida_at timestamptz;
