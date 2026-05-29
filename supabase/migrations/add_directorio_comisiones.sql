-- Comisiones en directorio de proveedores

alter table public.directorio_proveedores
  add column if not exists da_comision boolean not null default false;

alter table public.directorio_proveedores
  add column if not exists porcentaje_comision numeric(5, 2) default 10;
