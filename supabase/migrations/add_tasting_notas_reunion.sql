alter table public.tastings
  add column if not exists notas_reunion jsonb;

-- Si la columna existía como text, convertir a jsonb.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tastings'
      and column_name = 'notas_reunion'
      and data_type = 'text'
  ) then
    alter table public.tastings
      alter column notas_reunion type jsonb
      using case
        when notas_reunion is null or btrim(notas_reunion) = '' then null
        else notas_reunion::jsonb
      end;
  end if;
end $$;
