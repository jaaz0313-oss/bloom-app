"use client";

import { useEffect, useState } from "react";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import { supabase } from "@/lib/supabase";

type EntryMode = "directorio" | "manual";

type FormState = {
  categoria: string;
  nombre: string;
  instagram: string;
  ronda: string;
};

type DirectorioLookup = Pick<
  DirectorioProveedorRow,
  "id" | "nombre" | "categoria" | "instagram"
>;

type AgregarProveedorSugeridoModalProps = {
  open: boolean;
  onClose: () => void;
  defaultRonda: number;
  onSubmit: (payload: {
    directorio_proveedor_id: string | null;
    nombre_proveedor: string;
    categoria: string;
    instagram: string | null;
    ronda: number;
  }) => Promise<void>;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

const emptyForm = (defaultRonda: number): FormState => ({
  categoria: "",
  nombre: "",
  instagram: "",
  ronda: String(defaultRonda),
});

export function AgregarProveedorSugeridoModal({
  open,
  onClose,
  defaultRonda,
  onSubmit,
}: AgregarProveedorSugeridoModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultRonda));
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedDirectorioId, setSelectedDirectorioId] = useState<string | null>(
    null,
  );
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<DirectorioLookup[]>(
    [],
  );
  const [directorySearchedQuery, setDirectorySearchedQuery] = useState<
    string | null
  >(null);
  const [directoryPickerDismissed, setDirectoryPickerDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultRonda));
    setEntryMode(null);
    setSelectedDirectorioId(null);
    setDirectoryQuery("");
    setDirectoryResults([]);
    setDirectorySearchedQuery(null);
    setDirectoryPickerDismissed(false);
    setError(null);
  }, [open, defaultRonda]);

  useEffect(() => {
    if (!open || !supabase || entryMode !== "directorio") return;
    const categoria = form.categoria.trim();
    const query = directoryQuery.trim();
    if (!categoria || query.length < 2 || directoryPickerDismissed) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data, error: lookupError } = await supabase
        .from("directorio_proveedores")
        .select("id, nombre, categoria, instagram")
        .eq("activo", true)
        .eq("categoria", categoria)
        .ilike("nombre", `%${query}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (!cancelled) {
        if (lookupError) {
          setDirectoryResults([]);
        } else {
          setDirectoryResults((data ?? []) as DirectorioLookup[]);
        }
        setDirectorySearchedQuery(query);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    directoryPickerDismissed,
    directoryQuery,
    entryMode,
    form.categoria,
    open,
  ]);

  function handleCategoryChange(categoria: string) {
    setForm((current) => ({
      ...emptyForm(defaultRonda),
      categoria,
      ronda: current.ronda || String(defaultRonda),
    }));
    setEntryMode(null);
    setSelectedDirectorioId(null);
    setDirectoryQuery("");
    setDirectoryResults([]);
    setDirectorySearchedQuery(null);
    setDirectoryPickerDismissed(false);
    setError(null);
  }

  function selectDirectorioProvider(provider: DirectorioLookup) {
    setSelectedDirectorioId(provider.id);
    setForm((current) => ({
      ...current,
      nombre: provider.nombre,
      categoria: provider.categoria,
      instagram: provider.instagram ?? "",
    }));
    setDirectoryQuery(provider.nombre);
    setDirectoryResults([]);
    setDirectorySearchedQuery(provider.nombre);
    setDirectoryPickerDismissed(true);
  }

  const trimmedDirectoryQuery = directoryQuery.trim();
  const showDirectoryPicker =
    entryMode === "directorio" &&
    trimmedDirectoryQuery.length >= 2 &&
    !directoryPickerDismissed;
  const directorySearchPending =
    showDirectoryPicker && directorySearchedQuery !== trimmedDirectoryQuery;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const categoria = form.categoria.trim();
    const nombre = form.nombre.trim();
    const ronda = Number(form.ronda);

    if (!categoria) {
      setError("Selecciona una categoría.");
      return;
    }

    if (!nombre) {
      setError("Indica el nombre del proveedor.");
      return;
    }

    if (!Number.isFinite(ronda) || ronda < 1) {
      setError("La ronda debe ser un número mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        directorio_proveedor_id: selectedDirectorioId,
        nombre_proveedor: nombre,
        categoria,
        instagram: form.instagram.trim() || null,
        ronda,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo agregar la sugerencia.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Agregar sugerencia"
      subtitle="Sugerencia de proveedor para que los clientes marquen sus favoritos."
      closeDisabled={submitting}
      footer={
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
            type="submit"
            form="agregar-proveedor-sugerido-form"
            disabled={submitting}
            className="rounded-full bg-bloom-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Agregar"}
          </button>
        </div>
      }
    >
      <form
        id="agregar-proveedor-sugerido-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-bloom-ink">
            Categoría
          </span>
          <select
            value={form.categoria}
            onChange={(event) => handleCategoryChange(event.target.value)}
            className={inputClass}
            required
          >
            <option value="">Seleccionar categoría</option>
            {PROVIDER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        {form.categoria && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEntryMode("directorio");
                setSelectedDirectorioId(null);
                setForm((current) => ({
                  ...current,
                  nombre: "",
                  instagram: "",
                }));
                setDirectoryQuery("");
                setDirectoryPickerDismissed(false);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                entryMode === "directorio"
                  ? "bg-bloom-accent text-white"
                  : "border border-bloom-border text-bloom-ink hover:bg-bloom-canvas"
              }`}
            >
              Del directorio
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode("manual");
                setSelectedDirectorioId(null);
                setDirectoryQuery("");
                setDirectoryResults([]);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                entryMode === "manual"
                  ? "bg-bloom-accent text-white"
                  : "border border-bloom-border text-bloom-ink hover:bg-bloom-canvas"
              }`}
            >
              Manual
            </button>
          </div>
        )}

        {entryMode === "directorio" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-bloom-ink">
              Buscar en directorio
            </span>
            <input
              type="text"
              value={directoryQuery}
              onChange={(event) => {
                setDirectoryQuery(event.target.value);
                setDirectoryPickerDismissed(false);
                setSelectedDirectorioId(null);
              }}
              className={inputClass}
              placeholder="Escribe al menos 2 letras"
            />
            {showDirectoryPicker && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-bloom-border bg-bloom-surface">
                {directorySearchPending ? (
                  <li className="px-3 py-2 text-sm text-bloom-muted">
                    Buscando…
                  </li>
                ) : directoryResults.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-bloom-muted">
                    Sin resultados en esta categoría.
                  </li>
                ) : (
                  directoryResults.map((provider) => (
                    <li key={provider.id}>
                      <button
                        type="button"
                        onClick={() => selectDirectorioProvider(provider)}
                        className="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-bloom-canvas"
                      >
                        <span className="font-medium text-bloom-ink">
                          {provider.nombre}
                        </span>
                        {provider.instagram && (
                          <span className="text-bloom-muted">
                            {provider.instagram}
                          </span>
                        )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </label>
        )}

        {entryMode === "manual" && (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-bloom-ink">
                Nombre del proveedor
              </span>
              <input
                type="text"
                value={form.nombre}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-bloom-ink">
                Instagram
              </span>
              <input
                type="text"
                value={form.instagram}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    instagram: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="@usuario o URL"
              />
            </label>
          </>
        )}

        {entryMode === "directorio" && form.nombre && (
          <div className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/50 px-4 py-3 text-sm">
            <p className="font-medium text-bloom-ink">{form.nombre}</p>
            {form.instagram && (
              <p className="mt-0.5 text-bloom-muted">{form.instagram}</p>
            )}
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-bloom-ink">
            Ronda
          </span>
          <input
            type="number"
            min={1}
            value={form.ronda}
            onChange={(event) =>
              setForm((current) => ({ ...current, ronda: event.target.value }))
            }
            className={inputClass}
            required
          />
        </label>

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>
    </ResponsiveModal>
  );
}
