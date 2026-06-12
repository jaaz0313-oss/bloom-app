"use client";

import { useEffect, useState } from "react";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { formatCurrency } from "@/lib/format";
import type { SugerenciaPreviewItem } from "@/lib/proveedores-sugeridos-automaticos";
import { formatInstagramDisplay } from "@/lib/proveedores-sugeridos";
import { supabase } from "@/lib/supabase";

type PreviewCategoria = {
  categoria: string;
  precio_estimado: number;
  sin_historial: boolean;
  items: SugerenciaPreviewItem[];
};

type SugerirProveedoresAutomaticosModalProps = {
  open: boolean;
  onClose: () => void;
  categorias: PreviewCategoria[];
  ronda: number;
  onConfirm: (
    items: Array<{
      directorio_proveedor_id: string | null;
      nombre_proveedor: string;
      categoria: string;
      instagram: string | null;
      ronda: number;
      orden: number;
    }>,
  ) => Promise<void>;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

export function SugerirProveedoresAutomaticosModal({
  open,
  onClose,
  categorias: initialCategorias,
  ronda,
  onConfirm,
}: SugerirProveedoresAutomaticosModalProps) {
  const [categorias, setCategorias] = useState(initialCategorias);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [replaceResults, setReplaceResults] = useState<
    Pick<DirectorioProveedorRow, "id" | "nombre" | "categoria" | "instagram">[]
  >([]);
  const [manualCategoria, setManualCategoria] = useState<string | null>(null);
  const [manualNombre, setManualNombre] = useState("");
  const [manualInstagram, setManualInstagram] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategorias(initialCategorias);
    setError(null);
    setReplacingKey(null);
    setReplaceQuery("");
    setReplaceResults([]);
    setManualCategoria(null);
    setManualNombre("");
    setManualInstagram("");
  }, [open, initialCategorias]);

  useEffect(() => {
    if (!open || !replacingKey || !supabase) return;

    const categoria = categorias.find((group) =>
      group.items.some((item) => item.key === replacingKey),
    )?.categoria;

    const query = replaceQuery.trim();
    if (!categoria || query.length < 2) {
      setReplaceResults([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data } = await supabase
        .from("directorio_proveedores")
        .select("id, nombre, categoria, instagram")
        .eq("activo", true)
        .eq("categoria", categoria)
        .ilike("nombre", `%${query}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (!cancelled) {
        setReplaceResults(
          (data ?? []) as Pick<
            DirectorioProveedorRow,
            "id" | "nombre" | "categoria" | "instagram"
          >[],
        );
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [categorias, open, replaceQuery, replacingKey]);

  function updateCategoriaItems(
    categoria: string,
    updater: (items: SugerenciaPreviewItem[]) => SugerenciaPreviewItem[],
  ) {
    setCategorias((current) =>
      current.map((group) =>
        group.categoria === categoria
          ? { ...group, items: updater(group.items) }
          : group,
      ),
    );
  }

  function removeItem(categoria: string, key: string) {
    updateCategoriaItems(categoria, (items) =>
      items.filter((item) => item.key !== key),
    );
  }

  function moveItem(categoria: string, key: string, direction: "up" | "down") {
    updateCategoriaItems(categoria, (items) => {
      const index = items.findIndex((item) => item.key === key);
      if (index < 0) return items;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= items.length) return items;

      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function replaceItem(
    categoria: string,
    key: string,
    provider: Pick<DirectorioProveedorRow, "id" | "nombre" | "instagram">,
  ) {
    updateCategoriaItems(categoria, (items) =>
      items.map((item) =>
        item.key === key
          ? {
              ...item,
              directorio_proveedor_id: provider.id,
              nombre_proveedor: provider.nombre,
              instagram: provider.instagram,
              valor_promedio: null,
              veces_usado: null,
            }
          : item,
      ),
    );
    setReplacingKey(null);
    setReplaceQuery("");
    setReplaceResults([]);
  }

  function addManualItem(categoria: string) {
    const nombre = manualNombre.trim();
    if (!nombre) {
      setError("Indica el nombre del proveedor.");
      return;
    }

    updateCategoriaItems(categoria, (items) => [
      ...items,
      {
        key: crypto.randomUUID(),
        directorio_proveedor_id: null,
        nombre_proveedor: nombre,
        categoria,
        instagram: manualInstagram.trim() || null,
        valor_promedio: null,
        veces_usado: null,
      },
    ]);

    setManualCategoria(null);
    setManualNombre("");
    setManualInstagram("");
    setError(null);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const payloads: Array<{
        directorio_proveedor_id: string | null;
        nombre_proveedor: string;
        categoria: string;
        instagram: string | null;
        ronda: number;
        orden: number;
      }> = [];

      for (const group of categorias) {
        group.items.forEach((item, index) => {
          payloads.push({
            directorio_proveedor_id: item.directorio_proveedor_id,
            nombre_proveedor: item.nombre_proveedor,
            categoria: item.categoria,
            instagram: item.instagram,
            ronda,
            orden: index,
          });
        });
      }

      if (payloads.length === 0) {
        setError("Agrega al menos un proveedor antes de confirmar.");
        return;
      }

      await onConfirm(payloads);
      onClose();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "No se pudieron guardar las sugerencias.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const totalItems = categorias.reduce(
    (sum, group) => sum + group.items.length,
    0,
  );

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Sugerencias automáticas"
      subtitle={`Ronda ${ronda} · Revisa y ajusta antes de enviar al cliente`}
      size="lg"
      closeDisabled={submitting}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-bloom-muted">
            {totalItems} proveedor{totalItems === 1 ? "" : "es"} listos
          </span>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
            >
              {submitting ? "Guardando…" : "Confirmar y enviar al cliente"}
            </button>
          </div>
        </div>
      }
    >
      <div className="max-h-[min(70vh,42rem)] space-y-6 overflow-y-auto pr-1">
        {categorias.map((group) => (
          <section
            key={group.categoria}
            className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/30 p-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-display text-lg text-bloom-ink">
                  {group.categoria}
                </h3>
                <p className="text-sm text-bloom-muted">
                  Presupuesto estimado:{" "}
                  {formatCurrency(group.precio_estimado)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualCategoria(group.categoria);
                  setManualNombre("");
                  setManualInstagram("");
                  setError(null);
                }}
                className="mt-1 shrink-0 text-sm font-medium text-bloom-accent hover:underline"
              >
                + Agregar manual
              </button>
            </div>

            {group.sin_historial && group.items.length === 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sin historial suficiente para esta categoría. Agrega proveedores
                manualmente.
              </p>
            )}

            {manualCategoria === group.categoria && (
              <div className="mt-4 space-y-3 rounded-lg border border-bloom-border bg-bloom-surface p-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-bloom-muted">
                    Nombre
                  </span>
                  <input
                    type="text"
                    value={manualNombre}
                    onChange={(event) => setManualNombre(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-bloom-muted">
                    Instagram
                  </span>
                  <input
                    type="text"
                    value={manualInstagram}
                    onChange={(event) => setManualInstagram(event.target.value)}
                    className={inputClass}
                    placeholder="@usuario"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addManualItem(group.categoria)}
                    className="rounded-full bg-bloom-accent px-4 py-1.5 text-sm font-medium text-white"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualCategoria(null)}
                    className="rounded-full border border-bloom-border px-4 py-1.5 text-sm text-bloom-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <ul className="mt-4 space-y-2">
              {group.items.map((item, index) => (
                <li
                  key={item.key}
                  className="rounded-lg border border-bloom-border/80 bg-bloom-surface px-3 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(group.categoria, item.key, "up")}
                        disabled={index === 0}
                        className="rounded border border-bloom-border px-2 py-0.5 text-xs text-bloom-muted disabled:opacity-40"
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          moveItem(group.categoria, item.key, "down")
                        }
                        disabled={index === group.items.length - 1}
                        className="rounded border border-bloom-border px-2 py-0.5 text-xs text-bloom-muted disabled:opacity-40"
                        aria-label="Bajar"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-bloom-ink">
                        {item.nombre_proveedor}
                      </p>
                      {item.instagram && (
                        <p className="text-sm text-bloom-muted">
                          {formatInstagramDisplay(item.instagram)}
                        </p>
                      )}
                      {item.valor_promedio != null && item.veces_usado != null && (
                        <p className="mt-1 text-xs text-bloom-muted">
                          Promedio {formatCurrency(item.valor_promedio)} · usado{" "}
                          {item.veces_usado}{" "}
                          {item.veces_usado === 1 ? "vez" : "veces"}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingKey(item.key);
                          setReplaceQuery(item.nombre_proveedor);
                          setError(null);
                        }}
                        className="text-sm font-medium text-bloom-accent hover:underline"
                      >
                        Reemplazar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(group.categoria, item.key)}
                        className="text-sm font-medium text-red-700 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {replacingKey === item.key && (
                    <div className="mt-3 border-t border-bloom-border/70 pt-3">
                      <input
                        type="text"
                        value={replaceQuery}
                        onChange={(event) => setReplaceQuery(event.target.value)}
                        className={inputClass}
                        placeholder="Buscar en directorio"
                      />
                      {replaceResults.length > 0 && (
                        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-bloom-border">
                          {replaceResults.map((provider) => (
                            <li key={provider.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  replaceItem(group.categoria, item.key, provider)
                                }
                                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-bloom-canvas"
                              >
                                <span className="font-medium">
                                  {provider.nombre}
                                </span>
                                {provider.instagram && (
                                  <span className="text-bloom-muted">
                                    {provider.instagram}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => setReplacingKey(null)}
                        className="mt-2 text-sm text-bloom-muted hover:underline"
                      >
                        Cancelar reemplazo
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </ResponsiveModal>
  );
}
