"use client";

import { useEffect, useState } from "react";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { supabase } from "@/lib/supabase";

export type TastingProveedorSelection = {
  proveedor_id: string;
  nombre: string;
  categoria: string;
  email: string | null;
};

type TastingProveedorPickerProps = {
  value: TastingProveedorSelection | null;
  onChange: (value: TastingProveedorSelection | null) => void;
  disabled?: boolean;
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20";

export function TastingProveedorPicker({
  value,
  onChange,
  disabled = false,
}: TastingProveedorPickerProps) {
  const [query, setQuery] = useState(value?.nombre ?? "");
  const [results, setResults] = useState<
    Pick<DirectorioProveedorRow, "id" | "nombre" | "categoria" | "email">[]
  >([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.nombre);
    }
  }, [value]);

  useEffect(() => {
    if (!supabase || disabled) return;
    const trimmed = query.trim();
    if (trimmed.length < 2 || (value && value.nombre === trimmed)) {
      setResults([]);
      setSearchedQuery(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("directorio_proveedores")
        .select("id, nombre, categoria, email")
        .eq("activo", true)
        .ilike("nombre", `%${trimmed}%`)
        .order("nombre", { ascending: true })
        .limit(8);

      if (cancelled) return;
      if (error) {
        setResults([]);
        setSearchedQuery(trimmed);
        return;
      }

      setResults(
        (data ?? []) as Pick<
          DirectorioProveedorRow,
          "id" | "nombre" | "categoria" | "email"
        >[],
      );
      setSearchedQuery(trimmed);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, value, disabled]);

  function selectProvider(
    provider: Pick<
      DirectorioProveedorRow,
      "id" | "nombre" | "categoria" | "email"
    >,
  ) {
    onChange({
      proveedor_id: provider.id,
      nombre: provider.nombre,
      categoria: provider.categoria,
      email: provider.email?.trim() || null,
    });
    setQuery(provider.nombre);
    setResults([]);
    setSearchedQuery(null);
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        className={inputClass}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value && e.target.value.trim() !== value.nombre) {
            onChange(null);
          }
        }}
        placeholder="Buscar en directorio (mín. 2 letras)…"
        disabled={disabled}
        autoComplete="off"
      />

      {value && (
        <p className="text-xs text-bloom-muted">
          Seleccionado: {value.nombre}
          {value.categoria ? ` · ${value.categoria}` : ""}
        </p>
      )}

      {results.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-bloom-border bg-bloom-surface shadow-sm">
          {results.map((provider) => (
            <li key={provider.id}>
              <button
                type="button"
                onClick={() => selectProvider(provider)}
                className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition-colors hover:bg-bloom-canvas"
                disabled={disabled}
              >
                <span className="font-medium text-bloom-ink">{provider.nombre}</span>
                <span className="text-xs text-bloom-muted">{provider.categoria}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searchedQuery && results.length === 0 && !value && (
        <p className="text-xs text-bloom-muted">
          Sin resultados para &quot;{searchedQuery}&quot;.
        </p>
      )}
    </div>
  );
}
