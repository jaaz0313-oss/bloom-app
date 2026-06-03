-- Carpeta de Google Drive asociada a cada boda

create table if not exists public.boda_drive_folders (
  id uuid primary key default gen_random_uuid(),
  boda_id uuid not null references public.bodas(id) on delete cascade,
  drive_folder_id text not null,
  folder_name text,
  folder_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (boda_id)
);

create index if not exists boda_drive_folders_boda_id_idx
  on public.boda_drive_folders (boda_id);

alter table public.boda_drive_folders enable row level security;

drop policy if exists "Auth users manage boda drive folders" on public.boda_drive_folders;
create policy "Auth users manage boda drive folders"
  on public.boda_drive_folders
  for all
  using (true);
