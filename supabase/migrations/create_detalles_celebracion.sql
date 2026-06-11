-- Detalles de celebración completados por el cliente en el portal

create table if not exists public.detalles_celebracion (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null unique references public.bodas(id) on delete cascade,
  cancion_ingreso_novio text,
  cancion_ingreso_novia text,
  cancion_primer_beso text,
  cancion_salida text,
  cancion_ingreso_fiesta text,
  palabras_brindis text,
  protocolo_ingreso_ceremonia text,
  cancion_primer_baile text,
  cancion_baile_padres text,
  updated_at timestamptz not null default now()
);

create index if not exists detalles_celebracion_boda_id_idx
  on public.detalles_celebracion (boda_id);

alter table public.detalles_celebracion enable row level security;

drop policy if exists "Public access" on public.detalles_celebracion;
create policy "Public access"
  on public.detalles_celebracion for all using (true) with check (true);
