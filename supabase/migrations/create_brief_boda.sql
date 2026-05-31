-- Brief general interno por boda

create table if not exists public.brief_boda (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade unique,
  vision_concepto text,
  vision_colores text,
  vision_ambiente text,
  vision_inspiraciones text,
  vision_palabras_clave text,
  ceremonia_tipo text,
  ceremonia_celebrante text,
  ceremonia_musica text,
  ceremonia_inspiracion text,
  coctel_duracion text,
  coctel_ambiente text,
  coctel_musica text,
  coctel_estaciones text,
  recepcion_mesas text,
  recepcion_iluminacion text,
  recepcion_musica text,
  recepcion_primer_baile text,
  recepcion_baile_padres text,
  recepcion_canciones_no text,
  recepcion_hora_loca text,
  catering_tipo_servicio text,
  catering_menu text,
  catering_restricciones text,
  catering_torta text,
  catering_cocteleria text,
  catering_estacion_cafe text,
  foto_estilo text,
  foto_momentos_clave text,
  foto_no_quieren text,
  foto_album boolean not null default false,
  foto_drone boolean not null default false,
  foto_video text,
  decoracion_estilo text,
  decoracion_flores text,
  decoracion_colores text,
  decoracion_elementos text,
  extras_photobooth text,
  extras_hora_loca text,
  extras_cafe text,
  extras_otros text,
  logistica_transporte_novios text,
  logistica_transporte_invitados text,
  logistica_hotel text,
  restricciones text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists brief_boda_boda_id_idx on public.brief_boda (boda_id);

alter table public.brief_boda enable row level security;

drop policy if exists "Auth users" on public.brief_boda;
create policy "Auth users"
  on public.brief_boda for all to authenticated using (true) with check (true);

drop policy if exists "allow all brief_boda anon" on public.brief_boda;
create policy "allow all brief_boda anon"
  on public.brief_boda for all to anon using (true) with check (true);
