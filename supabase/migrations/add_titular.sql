-- Ejecutar si la tabla proveedores ya existe sin la columna titular_cuenta.
alter table public.proveedores
  add column if not exists titular_cuenta text;
