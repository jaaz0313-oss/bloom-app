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
  instagram_novia: string | null;
  instagram_novio: string | null;
  tipo_documento: string | null;
  tipo_documento_novia: string | null;
  tipo_documento_novio: string | null;
  documento_novia: string | null;
  documento_novio: string | null;
  whatsapp_grupo_link: string | null;
  seating_plan_link: string | null;
  mostrar_usd_cliente?: boolean | null;
  permitir_excel_cliente?: boolean | null;
  honorarios: number | null;
  anticipo_honorarios: number | null;
  lugar_venue: string | null;
  num_invitados: number | null;
  fecha_confirmada: boolean;
  google_event_id_fecha: string | null;
  fecha_boda_confirmada: string | null;
  estado?: string;
  created_at: string;
  updated_at?: string;
};

export function mapBodaToWedding(
  row: BodaRow,
  providerCounts?: { contracted: number; total: number },
): Wedding {
  return {
    id: row.id,
    couple: row.nombre_pareja,
    date: row.fecha_boda,
    city: row.ciudad,
    providersTotal: providerCounts?.total ?? row.total_proveedores,
    providersContracted:
      providerCounts?.contracted ?? row.proveedores_contratados,
  };
}

/** Agrega conteos reales desde filas de proveedores (excluye descartados del total). */
export function buildProviderCountsByBoda(
  providers: Array<{ boda_id: string; estado: string }>,
): Map<string, { contracted: number; total: number }> {
  const counts = new Map<string, { contracted: number; total: number }>();

  for (const provider of providers) {
    if (provider.estado === "descartado") continue;

    const current = counts.get(provider.boda_id) ?? {
      contracted: 0,
      total: 0,
    };
    current.total += 1;
    if (provider.estado === "contratado") {
      current.contracted += 1;
    }
    counts.set(provider.boda_id, current);
  }

  return counts;
}
