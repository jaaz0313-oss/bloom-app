-- Ejecutar si la tabla proveedores ya existe sin la columna tipo_cuenta.
alter table public.proveedores
  add column if not exists tipo_cuenta text;

