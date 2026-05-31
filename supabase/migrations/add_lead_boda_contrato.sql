-- Acuerdos de primera reunión en leads
alter table public.leads
  add column if not exists honorarios_acordados numeric;

alter table public.leads
  add column if not exists anticipo_acordado numeric;

alter table public.leads
  add column if not exists lugar_venue text;

-- Honorarios y venue en bodas
alter table public.bodas
  add column if not exists honorarios numeric;

alter table public.bodas
  add column if not exists anticipo_honorarios numeric;

alter table public.bodas
  add column if not exists lugar_venue text;

-- Contratos por boda
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade unique,
  honorarios numeric,
  anticipo numeric,
  saldo numeric,
  lugar_venue text,
  ciudad text,
  firmante text not null default 'novia' check (firmante in ('novia', 'novio')),
  fecha_firma date,
  estado text not null default 'borrador' check (estado in ('borrador', 'enviado', 'firmado')),
  created_at timestamptz not null default now()
);

create index if not exists contratos_boda_id_idx on public.contratos (boda_id);

alter table public.contratos enable row level security;

drop policy if exists "Auth users" on public.contratos;
create policy "Auth users"
  on public.contratos for all to authenticated using (true) with check (true);

drop policy if exists "allow all contratos anon" on public.contratos;
create policy "allow all contratos anon"
  on public.contratos for all to anon using (true) with check (true);
