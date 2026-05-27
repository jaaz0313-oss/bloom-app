-- Tabla de leads con RLS habilitado y políticas Allow all.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre_pareja text not null,
  fecha_tentativa date not null,
  ciudad text not null,
  presupuesto_estimado numeric(12, 2),
  cantidad_invitados integer,
  tipo_ceremonia text,
  pais_origen_novios text,
  ciudad_residencia_actual text,
  concepto_boda text,
  prioridades text,
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'en_conversacion', 'perdido')),
  notas text,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;

drop policy if exists "allow all leads select" on public.leads;
create policy "allow all leads select"
  on public.leads for select to anon, authenticated using (true);

drop policy if exists "allow all leads insert" on public.leads;
create policy "allow all leads insert"
  on public.leads for insert to anon, authenticated with check (true);

drop policy if exists "allow all leads update" on public.leads;
create policy "allow all leads update"
  on public.leads for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "allow all leads delete" on public.leads;
create policy "allow all leads delete"
  on public.leads for delete to anon, authenticated using (true);

