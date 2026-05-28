export type DirectorioProveedorRow = {
  id: string;
  nombre: string;
  categoria: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular: string | null;
  documento_nit: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
};
