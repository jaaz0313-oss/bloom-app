"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import { supabase } from "@/lib/supabase";

type Props = {
  initialRows: DirectorioProveedorRow[];
};

type FormState = {
  nombre: string;
  categoria: string;
  telefono: string;
  email: string;
  direccion: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  documentoNit: string;
  notas: string;
};

const emptyForm: FormState = {
  nombre: "",
  categoria: "",
  telefono: "",
  email: "",
  direccion: "",
  banco: "",
  tipoCuenta: "",
  numeroCuenta: "",
  titular: "",
  documentoNit: "",
  notas: "",
};

export function DirectorioPageClient({ initialRows }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DirectorioProveedorRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowUpdatingId, setRowUpdatingId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.nombre.toLowerCase().includes(term));
  }, [rows, query]);

  const groupedByCategory = useMemo(() => {
    const grouped = new Map<string, DirectorioProveedorRow[]>();
    for (const category of PROVIDER_CATEGORIES) grouped.set(category, []);
    for (const row of filteredRows) {
      if (!grouped.has(row.categoria)) grouped.set(row.categoria, []);
      grouped.get(row.categoria)!.push(row);
    }
    return grouped;
  }, [filteredRows]);

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEditModal(row: DirectorioProveedorRow) {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      categoria: row.categoria,
      telefono: row.telefono ?? "",
      email: row.email ?? "",
      direccion: row.direccion ?? "",
      banco: row.banco ?? "",
      tipoCuenta: row.tipo_cuenta ?? "",
      numeroCuenta: row.numero_cuenta ?? "",
      titular: row.titular ?? "",
      documentoNit: row.documento_nit ?? "",
      notas: row.notas ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      direccion: form.direccion.trim() || null,
      banco: form.banco.trim() || null,
      tipo_cuenta: form.tipoCuenta.trim() || null,
      numero_cuenta: form.numeroCuenta.trim() || null,
      titular: form.titular.trim() || null,
      documento_nit: form.documentoNit.trim() || null,
      notas: form.notas.trim() || null,
    };

    if (!payload.nombre) {
      setError("Ingresa el nombre del proveedor.");
      return;
    }
    if (!payload.categoria) {
      setError("Selecciona una categoría.");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const { data, error: updateError } = await supabase
          .from("directorio_proveedores")
          .update(payload)
          .eq("id", editing.id)
          .select("*")
          .single();
        if (updateError) {
          setError(updateError.message);
          return;
        }
        setRows((prev) =>
          prev.map((row) =>
            row.id === editing.id ? (data as DirectorioProveedorRow) : row,
          ),
        );
      } else {
        const { data, error: insertError } = await supabase
          .from("directorio_proveedores")
          .insert(payload)
          .select("*")
          .single();
        if (insertError) {
          setError(insertError.message);
          return;
        }
        setRows((prev) => [...prev, data as DirectorioProveedorRow]);
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(row: DirectorioProveedorRow) {
    if (!supabase || rowUpdatingId) return;
    setRowUpdatingId(row.id);
    const next = !row.activo;
    try {
      const { error: updateError } = await supabase
        .from("directorio_proveedores")
        .update({ activo: next })
        .eq("id", row.id);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setRows((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, activo: next } : item)),
      );
      router.refresh();
    } finally {
      setRowUpdatingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-bloom-ink">
            Directorio de proveedores
          </h1>
          <p className="mt-1 text-bloom-muted">
            Base global de proveedores por categoría.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
        >
          Agregar proveedor
        </button>
      </div>

      <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-4">
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-5">
        {Array.from(groupedByCategory.entries()).map(([category, categoryRows]) => {
          if (categoryRows.length === 0) return null;
          return (
            <div
              key={category}
              className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm"
            >
              <h2 className="font-display text-lg text-bloom-ink">{category}</h2>
              <ul className="mt-4 space-y-3">
                {categoryRows.map((row) => (
                  <li
                    key={row.id}
                    className={`rounded-xl border px-4 py-3 ${
                      row.activo
                        ? "border-bloom-border bg-bloom-canvas/40"
                        : "border-gray-200 bg-gray-100 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-bloom-ink">{row.nombre}</p>
                        <p className="text-sm text-bloom-muted">
                          {row.telefono || "Sin teléfono"} · {row.email || "Sin email"}
                        </p>
                        {(row.banco || row.tipo_cuenta || row.numero_cuenta) && (
                          <p className="mt-1 text-xs text-bloom-muted">
                            {row.banco || "Sin banco"} · {row.tipo_cuenta || "Sin tipo"} ·{" "}
                            {row.numero_cuenta || "Sin cuenta"}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {row.activo ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          disabled={rowUpdatingId === row.id}
                          className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                        >
                          {row.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Editar proveedor del directorio" : "Agregar proveedor al directorio"}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bloom-ink">
                  {editing ? "Editar proveedor" : "Nuevo proveedor"}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  <input
                    className={inputClass}
                    value={form.nombre}
                    onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="Categoría">
                  <select
                    className={inputClass}
                    value={form.categoria}
                    onChange={(e) => setForm((s) => ({ ...s, categoria: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar</option>
                    {PROVIDER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Teléfono">
                  <input
                    className={inputClass}
                    value={form.telefono}
                    onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Dirección">
                <input
                  className={inputClass}
                  value={form.direccion}
                  onChange={(e) => setForm((s) => ({ ...s, direccion: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Banco">
                  <input
                    className={inputClass}
                    value={form.banco}
                    onChange={(e) => setForm((s) => ({ ...s, banco: e.target.value }))}
                  />
                </Field>
                <Field label="Tipo de cuenta">
                  <select
                    className={inputClass}
                    value={form.tipoCuenta}
                    onChange={(e) => setForm((s) => ({ ...s, tipoCuenta: e.target.value }))}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Número de cuenta">
                  <input
                    className={inputClass}
                    value={form.numeroCuenta}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, numeroCuenta: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Titular">
                  <input
                    className={inputClass}
                    value={form.titular}
                    onChange={(e) => setForm((s) => ({ ...s, titular: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Documento / NIT">
                <input
                  className={inputClass}
                  value={form.documentoNit}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, documentoNit: e.target.value }))
                  }
                />
              </Field>
              <Field label="Notas">
                <textarea
                  className={textareaClass}
                  value={form.notas}
                  onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                  rows={3}
                />
              </Field>

              {error && (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-full border border-bloom-border bg-bloom-surface px-5 py-2.5 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-bloom-ink">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";
