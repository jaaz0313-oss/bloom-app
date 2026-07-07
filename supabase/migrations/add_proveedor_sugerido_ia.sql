-- Marca los proveedores sugeridos que provienen de las sugerencias inteligentes
-- basadas en bodas similares (feature de similitud al convertir un lead a boda).
alter table public.proveedores_sugeridos
  add column if not exists sugerido_por_ia boolean not null default false;
