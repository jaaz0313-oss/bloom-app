-- Campos del flujo de leads mejorado
alter table public.leads
  add column if not exists nombre_novia text,
  add column if not exists nombre_novio text,
  add column if not exists telefono text,
  add column if not exists tipo_boda text,
  add column if not exists es_boda_destino boolean not null default false,
  add column if not exists como_nos_conocieron text;
