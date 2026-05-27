-- Ejecutar si la tabla leads ya existe sin estos campos adicionales.
alter table public.leads
  add column if not exists cantidad_invitados integer,
  add column if not exists tipo_ceremonia text,
  add column if not exists pais_origen_novios text,
  add column if not exists ciudad_residencia_actual text,
  add column if not exists concepto_boda text,
  add column if not exists prioridades text;

