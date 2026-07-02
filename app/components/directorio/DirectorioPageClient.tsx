"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { ProviderComisionFields } from "@/app/components/bodas/ProviderComisionFields";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import {
  canDeactivateDirectorio,
  canEditDirectorio,
  type UserRole,
} from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

type Props = {
  initialRows: DirectorioProveedorRow[];
  role: UserRole;
};

type FormState = {
  nombre: string;
  categoria: string;
  nombreContacto: string;
  telefono: string;
  email: string;
  instagram: string;
  paginaWeb: string;
  especialidad: string;
  fortalezas: string;
  ciudadBase: string;
  otrasCiudades: string;
  direccion: string;
  anticipoRequerido: string;
  incluyeIva: boolean;
  condicionesPago: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  codigoSwift: string;
  cuentaUsa: string;
  paypal: string;
  titular: string;
  documentoNit: string;
  notas: string;
  daComision: boolean;
  porcentajeComision: string;
};

const emptyForm: FormState = {
  nombre: "",
  categoria: "",
  nombreContacto: "",
  telefono: "",
  email: "",
  instagram: "",
  paginaWeb: "",
  especialidad: "",
  fortalezas: "",
  ciudadBase: "",
  otrasCiudades: "",
  direccion: "",
  anticipoRequerido: "",
  incluyeIva: false,
  condicionesPago: "",
  banco: "",
  tipoCuenta: "",
  numeroCuenta: "",
  codigoSwift: "",
  cuentaUsa: "",
  paypal: "",
  titular: "",
  documentoNit: "",
  notas: "",
  daComision: false,
  porcentajeComision: "10",
};

function groupProvidersByCategory(
  providers: DirectorioProveedorRow[],
): { category: string; providers: DirectorioProveedorRow[] }[] {
  const grouped = new Map<string, DirectorioProveedorRow[]>();

  for (const row of providers) {
    const category = row.categoria?.trim() || "Sin categoría";
    const list = grouped.get(category) ?? [];
    list.push(row);
    grouped.set(category, list);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }

  const knownCategories = PROVIDER_CATEGORIES as readonly string[];
  const orderedKeys = [
    ...PROVIDER_CATEGORIES.filter((c) => grouped.has(c)),
    ...[...grouped.keys()]
      .filter((c) => !knownCategories.includes(c))
      .sort((a, b) => a.localeCompare(b, "es")),
  ];

  return orderedKeys.map((category) => ({
    category,
    providers: grouped.get(category) ?? [],
  }));
}

export function DirectorioPageClient({
  initialRows,
  role,
}: Props) {
  const canEdit = canEditDirectorio(role);
  const canDeactivate = canDeactivateDirectorio(role);
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DirectorioProveedorRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowUpdatingId, setRowUpdatingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const searchTerm = query.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.nombre,
        row.ciudad_base,
        row.telefono,
        row.email,
        row.nombre_contacto,
        row.categoria,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [rows, searchTerm]);

  const categorySections = useMemo(
    () => groupProvidersByCategory(filteredRows),
    [filteredRows],
  );

  useEffect(() => {
    if (!searchTerm) return;
    setExpandedCategories(
      new Set(categorySections.map((section) => section.category)),
    );
  }, [searchTerm, categorySections]);

  useEffect(() => {
    if (searchTerm) return;
    setExpandedCategories(new Set());
  }, [searchTerm]);

  const toggleCategoryExpanded = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  function openCreateModal() {
    if (!canEdit) return;
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEditModal(row: DirectorioProveedorRow) {
    if (!canEdit) return;
    setEditing(row);
    setForm({
      nombre: row.nombre,
      categoria: row.categoria,
      nombreContacto: row.nombre_contacto ?? "",
      telefono: row.telefono ?? "",
      email: row.email ?? "",
      instagram: row.instagram ?? "",
      paginaWeb: row.pagina_web ?? "",
      especialidad: row.especialidad ?? "",
      fortalezas: row.fortalezas ?? "",
      ciudadBase: row.ciudad_base ?? "",
      otrasCiudades: row.otras_ciudades ?? "",
      direccion: row.direccion ?? "",
      anticipoRequerido:
        row.anticipo_requerido != null ? String(row.anticipo_requerido) : "",
      incluyeIva: row.incluye_iva ?? false,
      condicionesPago: row.condiciones_pago ?? "",
      banco: row.banco ?? "",
      tipoCuenta: row.tipo_cuenta ?? "",
      numeroCuenta: row.numero_cuenta ?? "",
      codigoSwift: row.codigo_swift ?? "",
      cuentaUsa: row.cuenta_usa ?? "",
      paypal: row.paypal ?? "",
      titular: row.titular ?? "",
      documentoNit: row.documento_nit ?? "",
      notas: row.notas ?? "",
      daComision: row.da_comision ?? false,
      porcentajeComision: String(
        row.porcentaje_comision != null ? row.porcentaje_comision : 10,
      ),
    });
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const anticipoRequeridoValue = form.anticipoRequerido.trim()
      ? Number(form.anticipoRequerido)
      : null;

    if (
      anticipoRequeridoValue != null &&
      (!Number.isFinite(anticipoRequeridoValue) || anticipoRequeridoValue < 0)
    ) {
      setError("Ingresa un anticipo requerido válido.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim(),
      nombre_contacto: form.nombreContacto.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      instagram: form.instagram.trim() || null,
      pagina_web: form.paginaWeb.trim() || null,
      especialidad: form.especialidad.trim() || null,
      fortalezas: form.fortalezas.trim() || null,
      ciudad_base: form.ciudadBase.trim() || null,
      otras_ciudades: form.otrasCiudades.trim() || null,
      direccion: form.direccion.trim() || null,
      anticipo_requerido: anticipoRequeridoValue,
      incluye_iva: form.incluyeIva,
      condiciones_pago: form.condicionesPago.trim() || null,
      banco: form.banco.trim() || null,
      tipo_cuenta: form.tipoCuenta.trim() || null,
      numero_cuenta: form.numeroCuenta.trim() || null,
      codigo_swift: form.codigoSwift.trim() || null,
      cuenta_usa: form.cuentaUsa.trim() || null,
      paypal: form.paypal.trim() || null,
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

    const daComision = form.daComision;
    let porcentajeComision = 10;
    if (daComision) {
      const pct = Number(form.porcentajeComision);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        setError("Ingresa un porcentaje de comisión válido (0–100).");
        return;
      }
      porcentajeComision = pct;
    }

    const comisionPayload = {
      da_comision: daComision,
      porcentaje_comision: daComision
        ? porcentajeComision
        : (editing?.porcentaje_comision ?? 10),
    };

    setSubmitting(true);
    try {
      if (editing) {
        const { data, error: updateError } = await supabase
          .from("directorio_proveedores")
          .update({ ...payload, ...comisionPayload })
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
          .insert({ ...payload, ...comisionPayload })
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
    if (!canDeactivate || !supabase || rowUpdatingId) return;
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
        {canEdit && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover"
          >
            Agregar proveedor
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-bloom-border bg-bloom-surface p-4">
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, ciudad, teléfono o contacto"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {categorySections.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-10 text-center text-sm text-bloom-muted">
          {searchTerm
            ? "No hay proveedores que coincidan con tu búsqueda."
            : "Aún no hay proveedores en el directorio."}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-bloom-muted">
            {searchTerm
              ? `${categorySections.length} categorías con resultados — haz clic para ver proveedores`
              : `${categorySections.length} categorías — haz clic en cada una para expandir`}
          </p>
          {categorySections.map(({ category, providers }) => {
            const isOpen = expandedCategories.has(category);
            return (
              <div
                key={category}
                className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleCategoryExpanded(category)}
                  aria-expanded={isOpen}
                  className="flex w-full touch-manipulation items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-bloom-canvas/60"
                >
                  <span className="font-display text-lg text-bloom-ink">
                    {category} ({providers.length})
                  </span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-bloom-border px-5 pb-4">
                    <ul className="space-y-3 pt-3">
                      {providers.map((row) => (
                        <li
                          key={row.id}
                          className={`rounded-xl border px-4 py-3 sm:px-5 ${
                            row.activo
                              ? "border-bloom-border bg-bloom-canvas/40"
                              : "border-gray-200 bg-gray-100/80 opacity-80"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-bloom-ink">
                                {row.nombre}
                              </p>
                              <p className="text-sm text-bloom-muted">
                                {row.ciudad_base || "Sin ciudad base"}
                              </p>
                              <p className="text-sm text-bloom-muted">
                                {row.telefono || "Sin teléfono"}
                              </p>
                            </div>
                            {canEdit || canDeactivate ? (
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(row)}
                                    className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                                  >
                                    Editar
                                  </button>
                                )}
                                {canDeactivate && (
                                  <button
                                    type="button"
                                    onClick={() => toggleActive(row)}
                                    disabled={rowUpdatingId === row.id}
                                    className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
                                  >
                                    {row.activo ? "Desactivar" : "Activar"}
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && open && (
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

            <form className="mt-5 space-y-6" onSubmit={onSubmit}>
              <FormSection title="Información general">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nombre del proveedor / empresa">
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
                      onChange={(e) =>
                        setForm((s) => ({ ...s, categoria: e.target.value }))
                      }
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
                  <Field label="Especialidad">
                    <input
                      className={inputClass}
                      value={form.especialidad}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, especialidad: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Ciudad base">
                    <input
                      className={inputClass}
                      value={form.ciudadBase}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, ciudadBase: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Fortalezas principales">
                  <textarea
                    className={textareaClass}
                    value={form.fortalezas}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fortalezas: e.target.value }))
                    }
                    rows={3}
                  />
                </Field>
                <Field label="Otras ciudades donde opera">
                  <input
                    className={inputClass}
                    value={form.otrasCiudades}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, otrasCiudades: e.target.value }))
                    }
                  />
                </Field>
              </FormSection>

              <FormSection title="Contacto">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nombre de contacto principal">
                    <input
                      className={inputClass}
                      value={form.nombreContacto}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, nombreContacto: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Teléfono">
                    <input
                      className={inputClass}
                      value={form.telefono}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, telefono: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Email">
                    <input
                      type="email"
                      className={inputClass}
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Dirección">
                    <input
                      className={inputClass}
                      value={form.direccion}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, direccion: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Instagram">
                    <input
                      className={inputClass}
                      value={form.instagram}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, instagram: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Página web">
                    <input
                      className={inputClass}
                      value={form.paginaWeb}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, paginaWeb: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="Información financiera">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Anticipo requerido">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={form.anticipoRequerido}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, anticipoRequerido: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Incluye IVA">
                    <label className="flex h-10 items-center gap-2 rounded-xl border border-bloom-border bg-bloom-canvas px-3 text-sm text-bloom-ink">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
                        checked={form.incluyeIva}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, incluyeIva: e.target.checked }))
                        }
                      />
                      Sí, este proveedor incluye IVA
                    </label>
                  </Field>
                </div>
                <Field label="Condiciones de pago">
                  <textarea
                    className={textareaClass}
                    value={form.condicionesPago}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, condicionesPago: e.target.value }))
                    }
                    rows={2}
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
                      onChange={(e) =>
                        setForm((s) => ({ ...s, tipoCuenta: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setForm((s) => ({ ...s, titular: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Código SWIFT">
                    <input
                      className={inputClass}
                      value={form.codigoSwift}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, codigoSwift: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Cuenta USA">
                    <input
                      className={inputClass}
                      value={form.cuentaUsa}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, cuentaUsa: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="PayPal">
                    <input
                      className={inputClass}
                      value={form.paypal}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, paypal: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Documento / NIT">
                    <input
                      className={inputClass}
                      value={form.documentoNit}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, documentoNit: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </FormSection>

              <ProviderComisionFields
                daComision={form.daComision}
                porcentajeComision={form.porcentajeComision}
                onDaComisionChange={(daComision) =>
                  setForm((s) => ({ ...s, daComision }))
                }
                onPorcentajeChange={(porcentajeComision) =>
                  setForm((s) => ({ ...s, porcentajeComision }))
                }
                disabled={submitting}
                inputClass={inputClass}
              />

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

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 p-4 sm:p-5">
      <h4 className="font-display text-lg text-bloom-ink">{title}</h4>
      {children}
    </section>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";
