-- Ejecutar si la tabla proveedores ya existe sin estas columnas.
alter table public.proveedores
  add column if not exists descripcion_servicio text,
  add column if not exists notas text;
