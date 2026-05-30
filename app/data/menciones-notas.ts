export type MencionNotaRow = {
  id: string;
  nota_id: string;
  usuario_id: string;
  visto: boolean;
  created_at: string;
};

export type MencionNotaConDetalle = MencionNotaRow & {
  notas_boda: {
    contenido: string;
    boda_id: string;
    bodas: { nombre_pareja: string } | null;
  } | null;
};
