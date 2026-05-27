-- Ejecutar si la tabla bodas ya existe sin estas columnas.
alter table public.bodas
  add column if not exists nombre_novia text,
  add column if not exists nombre_novio text,
  add column if not exists telefono_novia text,
  add column if not exists telefono_novio text,
  add column if not exists email_novia text,
  add column if not exists email_novio text,
  add column if not exists direccion text,
  add column if not exists tipo_documento_novia text,
  add column if not exists tipo_documento_novio text,
  add column if not exists documento_novia text,
  add column if not exists documento_novio text;

