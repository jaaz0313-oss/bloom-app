-- Proveedor y emails para invites de citas

alter table public.citas
  add column if not exists proveedor_id uuid references public.proveedores(id) on delete set null;

alter table public.citas
  add column if not exists emails_involucrados text[];

create index if not exists citas_proveedor_id_idx on public.citas (proveedor_id);
