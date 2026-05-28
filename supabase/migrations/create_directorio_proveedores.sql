create table if not exists directorio_proveedores (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  categoria text not null,
  telefono text,
  email text,
  direccion text,
  banco text,
  tipo_cuenta text,
  numero_cuenta text,
  titular text,
  documento_nit text,
  notas text,
  activo boolean default true,
  created_at timestamp default now()
);

alter table directorio_proveedores enable row level security;

drop policy if exists "Authenticated users can manage directorio" on directorio_proveedores;
create policy "Authenticated users can manage directorio"
on directorio_proveedores
for all
using (true);
