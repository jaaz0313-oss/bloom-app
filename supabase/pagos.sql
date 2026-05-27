-- La tabla pagos ya existe. Ejecutar solo si faltan políticas RLS.

alter table public.pagos enable row level security;
alter table public.pagos
  add column if not exists comprobante_url text;

drop policy if exists "anon select pagos" on public.pagos;
create policy "anon select pagos"
  on public.pagos for select to anon, authenticated using (true);

drop policy if exists "anon insert pagos" on public.pagos;
create policy "anon insert pagos"
  on public.pagos for insert to anon, authenticated with check (true);

drop policy if exists "anon update pagos" on public.pagos;
create policy "anon update pagos"
  on public.pagos for update to anon, authenticated
  using (true) with check (true);

drop policy if exists "anon delete pagos" on public.pagos;
create policy "anon delete pagos"
  on public.pagos for delete to anon, authenticated
  using (true);
