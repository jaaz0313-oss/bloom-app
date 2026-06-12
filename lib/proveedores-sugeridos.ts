import type { ProveedorSugeridoWithSelection } from "@/app/data/proveedores-sugeridos";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";

export function canManageProveedoresSugeridos(role: UserRole): boolean {
  return hasPermission(role, "providers.manage");
}

export type ProveedorSugeridoRondaGroup = {
  ronda: number;
  categorias: ProveedorSugeridoCategoriaGroup[];
};

export type ProveedorSugeridoCategoriaGroup = {
  categoria: string;
  proveedores: ProveedorSugeridoWithSelection[];
};

export function groupProveedoresSugeridosByRonda(
  items: ProveedorSugeridoWithSelection[],
): ProveedorSugeridoRondaGroup[] {
  const rondaMap = new Map<number, Map<string, ProveedorSugeridoWithSelection[]>>();

  for (const item of items) {
    const categorias = rondaMap.get(item.ronda) ?? new Map();
    const list = categorias.get(item.categoria) ?? [];
    list.push(item);
    categorias.set(item.categoria, list);
    rondaMap.set(item.ronda, categorias);
  }

  return Array.from(rondaMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ronda, categorias]) => ({
      ronda,
      categorias: Array.from(categorias.entries())
        .sort(([a], [b]) => a.localeCompare(b, "es"))
        .map(([categoria, proveedores]) => ({
          categoria,
          proveedores: [...proveedores].sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.nombre_proveedor.localeCompare(b.nombre_proveedor, "es");
          }),
        })),
    }));
}

export function groupProveedoresSugeridosByCategoria(
  items: ProveedorSugeridoWithSelection[],
): ProveedorSugeridoCategoriaGroup[] {
  const map = new Map<string, ProveedorSugeridoWithSelection[]>();

  for (const item of items) {
    const list = map.get(item.categoria) ?? [];
    list.push(item);
    map.set(item.categoria, list);
  }

  const knownCategories = PROVIDER_CATEGORIES as readonly string[];
  const orderedCategories = [
    ...knownCategories.filter((category) => map.has(category)),
    ...Array.from(map.keys())
      .filter((category) => !knownCategories.includes(category as never))
      .sort((a, b) => a.localeCompare(b, "es")),
  ];

  return orderedCategories.map((categoria) => ({
    categoria,
    proveedores: [...(map.get(categoria) ?? [])].sort((a, b) => {
      if (a.ronda !== b.ronda) return a.ronda - b.ronda;
      if (a.orden !== b.orden) return a.orden - b.orden;
      return a.nombre_proveedor.localeCompare(b.nombre_proveedor, "es");
    }),
  }));
}

export function buildInstagramUrl(instagram: string | null | undefined): string | null {
  const value = instagram?.trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const handle = value.replace(/^@/, "");
  return `https://instagram.com/${handle}`;
}

export function formatInstagramDisplay(instagram: string | null | undefined): string {
  const value = instagram?.trim();
  if (!value) return "";
  if (value.startsWith("@")) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const pathname = new URL(value).pathname.replace(/^\//, "");
      return pathname ? `@${pathname.split("/")[0]}` : value;
    } catch {
      return value;
    }
  }
  return `@${value}`;
}

export function parseProveedorSugeridoSeleccionBody(body: unknown): {
  proveedor_sugerido_id: string;
  seleccionado: boolean;
} | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const proveedor_sugerido_id = record.proveedor_sugerido_id;
  const seleccionado = record.seleccionado;

  if (typeof proveedor_sugerido_id !== "string" || !proveedor_sugerido_id.trim()) {
    return null;
  }

  if (typeof seleccionado !== "boolean") {
    return null;
  }

  return {
    proveedor_sugerido_id: proveedor_sugerido_id.trim(),
    seleccionado,
  };
}
