-- Citas y calendario

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (
    tipo in (
      'primera_reunion',
      'reunion_seguimiento',
      'reunion_proveedor',
      'reunion_planificacion'
    )
  ),
  titulo text not null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time,
  lugar text,
  link_meet text,
  notas text,
  boda_id uuid references public.bodas(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  asignado_a uuid references auth.users(id),
  asignado_nombre text,
  confirmada boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists citas_fecha_idx on public.citas (fecha);
create index if not exists citas_boda_id_idx on public.citas (boda_id);
create index if not exists citas_lead_id_idx on public.citas (lead_id);

alter table public.citas enable row level security;

drop policy if exists "Auth users" on public.citas;
create policy "Auth users"
  on public.citas
  for all
  using (true);
