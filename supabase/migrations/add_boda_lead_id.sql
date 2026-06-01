-- Vincular bodas convertidas desde leads para conservar acceso a cotizaciones
alter table public.bodas
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists bodas_lead_id_idx on public.bodas (lead_id);
