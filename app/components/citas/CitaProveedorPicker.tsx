"use client";

import { useEffect, useMemo, useState } from "react";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { supabase } from "@/lib/supabase";

export type CitaProveedorCita = {
  nombre: string;
  categoria: string;
  email: string | null;
  telefono?: string | null;
};

type EntryMode = "directorio" | "manual";

type CitaProveedorPickerProps = {
  open: boolean;
  value: CitaProveedorCita | null;
  onChange: (value: CitaProveedorCita | null) => void;
  onInteraction?: () => void;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

export function CitaProveedorPicker({
  open,
  value,
  onChange,
  onInteraction,
}: CitaProveedorPickerProps) {
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<
    Pick<DirectorioProveedorRow, "id" | "nombre" | "categoria" | "email" | "telefono">[]
  >([]);
  const [directorySearchedQuery, setDirectorySearchedQuery] = useState<
    string | null
  >(null);
  const [directoryPickerDismissed, setDirectoryPickerDismissed] = useState(false);
  const [manualNombre, setManualNombre] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  useEffect(() => {
    if (!open) {
      setEntryMode(null);
      setDirectoryQuery("");
      setDirectoryResults([]);
      setDirectorySearchedQuery(null);
      setDirectoryPickerDismissed(false);
      setManualNombre("");
      setManualEmail("");
    }
  }, [open]);

  useEffect(() => {
    if (entryMode === "manual") {
      const nombre = manualNombre.trim();
      if (!nombre) {
        onChange(null);
        return;
      }
      onChange({
        nombre,
        categoria: "Proveedor",
        email: manualEmail.trim() || null,
      });
    }
  }, [entryMode, manualNombre, manualEmail, onChange]);

  useEffect(() => {
    if (!open || !supabase || entryMode !== "directorio") return;
    const query = directoryQuery.trim();
    if (query.length < 2 || directoryPickerDismissed) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("directorio_proveedores")
        .select("id, nombre, categoria, email, telefono")
        .eq("activo", true)
        .ilike("nombre", `%${query}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (cancelled) return;
      if (error) {
        setDirectoryResults([]);
      } else {
        setDirectoryResults(
          (data ?? []) as Pick<
            DirectorioProveedorRow,
            "id" | "nombre" | "categoria" | "email" | "telefono"
          >[],
        );
      }
      setDirectorySearchedQuery(query);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [directoryPickerDismissed, directoryQuery, entryMode, open]);

  const showDirectoryPicker =
    entryMode === "directorio" &&
    directoryQuery.trim().length >= 2 &&
    !directoryPickerDismissed;

  const directorySearchPending =
    showDirectoryPicker &&
    directorySearchedQuery !== directoryQuery.trim();

  const showDirectoryEmptyState =
    showDirectoryPicker &&
    !directorySearchPending &&
    directorySearchedQuery === directoryQuery.trim() &&
    directoryResults.length === 0;

  function selectEntryMode(mode: EntryMode) {
    onInteraction?.();
    setEntryMode(mode);
    setDirectoryQuery("");
    setDirectoryResults([]);
    setDirectorySearchedQuery(null);
    setDirectoryPickerDismissed(false);
    setManualNombre("");
    setManualEmail("");
    onChange(null);
  }

  function applyDirectoryProvider(
    provider: Pick<
      DirectorioProveedorRow,
      "nombre" | "categoria" | "email" | "telefono"
    >,
  ) {
    onInteraction?.();
    setDirectoryQuery(provider.nombre);
    setDirectoryPickerDismissed(true);
    onChange({
      nombre: provider.nombre,
      categoria: provider.categoria,
      email: provider.email?.trim() || null,
      telefono: provider.telefono?.trim() || null,
    });
  }

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    return `${value.categoria} — ${value.nombre}`;
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-sm font-medium text-bloom-ink">Proveedor</p>
        <div
          className="inline-flex w-full rounded-full border border-bloom-border bg-bloom-canvas p-1"
          role="group"
          aria-label="Modo de proveedor para la cita"
        >
          <button
            type="button"
            onClick={() => selectEntryMode("directorio")}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              entryMode === "directorio"
                ? "bg-bloom-accent text-white shadow-sm"
                : "text-bloom-ink hover:bg-bloom-border"
            }`}
          >
            Buscar en directorio
          </button>
          <button
            type="button"
            onClick={() => selectEntryMode("manual")}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              entryMode === "manual"
                ? "bg-bloom-accent text-white shadow-sm"
                : "text-bloom-ink hover:bg-bloom-border"
            }`}
          >
            Agregar manualmente
          </button>
        </div>
      </div>

      {entryMode === "directorio" && (
        <Field label="Buscar en directorio">
          <div className="space-y-2">
            <input
              className={inputClass}
              value={directoryQuery}
              onChange={(e) => {
                onInteraction?.();
                setDirectoryQuery(e.target.value);
                setDirectoryPickerDismissed(false);
                setDirectorySearchedQuery(null);
                if (value) onChange(null);
              }}
              placeholder="Escribe para buscar por nombre"
            />
            {selectedLabel && directoryPickerDismissed && (
              <p className="text-xs text-bloom-muted">
                Seleccionado:{" "}
                <span className="font-medium text-bloom-ink">{selectedLabel}</span>
                {value?.email ? (
                  <>
                    {" "}
                    · <span className="text-bloom-ink">{value.email}</span>
                  </>
                ) : null}
              </p>
            )}
            {showDirectoryPicker && (
              <div className="rounded-xl border border-bloom-border bg-bloom-surface">
                {directorySearchPending ? (
                  <p className="px-3 py-2 text-sm text-bloom-muted">Buscando…</p>
                ) : showDirectoryEmptyState ? (
                  <p className="px-3 py-2 text-sm text-bloom-muted">
                    No hay proveedores del directorio para esta búsqueda.
                  </p>
                ) : directoryResults.length > 0 ? (
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {directoryResults.map((provider) => (
                      <li key={provider.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-bloom-ink transition-colors hover:bg-bloom-canvas"
                          onClick={() => applyDirectoryProvider(provider)}
                        >
                          <span>{provider.nombre}</span>
                          <span className="shrink-0 text-xs text-bloom-muted">
                            {provider.categoria}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        </Field>
      )}

      {entryMode === "manual" && (
        <>
          <Field label="Nombre del proveedor">
            <input
              className={inputClass}
              value={manualNombre}
              onChange={(e) => {
                onInteraction?.();
                setManualNombre(e.target.value);
              }}
              placeholder="Ej: Fotografía Luna"
              required
            />
          </Field>
          <Field label="Email del proveedor (opcional)">
            <input
              type="email"
              className={inputClass}
              value={manualEmail}
              onChange={(e) => {
                onInteraction?.();
                setManualEmail(e.target.value);
              }}
              placeholder="proveedor@ejemplo.com"
            />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}
