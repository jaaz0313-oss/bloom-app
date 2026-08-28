alter table public.presupuesto_estimado_categorias
  add column if not exists mostrar_nota_cliente boolean default false;
