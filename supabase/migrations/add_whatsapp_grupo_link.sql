-- Link del grupo de WhatsApp por boda.
alter table public.bodas
  add column if not exists whatsapp_grupo_link text;
