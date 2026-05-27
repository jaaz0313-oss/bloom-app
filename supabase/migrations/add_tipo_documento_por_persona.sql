-- Ejecutar para usar tipo de documento independiente por persona.
alter table public.bodas
  add column if not exists tipo_documento_novia text,
  add column if not exists tipo_documento_novio text;

-- Migración opcional de datos previos compartidos.
update public.bodas
set tipo_documento_novia = coalesce(tipo_documento_novia, tipo_documento)
where tipo_documento is not null;

