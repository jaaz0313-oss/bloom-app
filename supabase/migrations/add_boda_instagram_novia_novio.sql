alter table bodas
  add column if not exists instagram_novia text,
  add column if not exists instagram_novio text;

-- Migrar dato del campo general anterior, si existía
update bodas
set instagram_novia = instagram
where instagram_novia is null
  and instagram is not null
  and trim(instagram) <> '';
