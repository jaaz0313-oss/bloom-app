export type CitaLookupBoda = {
  id: string;
  nombre_pareja: string;
  telefono_novia: string | null;
  telefono_novio: string | null;
  whatsapp_grupo_link: string | null;
  email_novia: string | null;
  email_novio: string | null;
};

export type CitaLookupLead = {
  id: string;
  nombre_pareja: string;
};

export type CitaLookupEquipo = {
  id: string;
  nombre: string;
  email?: string | null;
  username?: string | null;
};
