export type Wedding = {
  id: string;
  couple: string;
  date: string;
  city: string;
  providersContracted: number;
  providersTotal: number;
};

export type BodaRow = {
  id: string;
  lead_id: string | null;
  nombre_pareja: string;
  fecha_boda: string;
  ciudad: string;
  total_proveedores: number;
  proveedores_contratados: number;
  nombre_novia: string | null;
  nombre_novio: string | null;
  telefono_novia: string | null;
  telefono_novio: string | null;
  email_novia: string | null;
  email_novio: string | null;
  direccion: string | null;
  tipo_documento: string | null;
  tipo_documento_novia: string | null;
  tipo_documento_novio: string | null;
  documento_novia: string | null;
  documento_novio: string | null;
  whatsapp_grupo_link: string | null;
  honorarios: number | null;
  anticipo_honorarios: number | null;
  lugar_venue: string | null;
  created_at: string;
};

export function mapBodaToWedding(row: BodaRow): Wedding {
  return {
    id: row.id,
    couple: row.nombre_pareja,
    date: row.fecha_boda,
    city: row.ciudad,
    providersTotal: row.total_proveedores,
    providersContracted: row.proveedores_contratados,
  };
}
