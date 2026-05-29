"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CotizacionEstado,
  CotizacionItemRow,
  CotizacionRow,
} from "@/app/data/cotizaciones";
import { COTIZACION_ESTADO_LABELS } from "@/app/data/cotizaciones";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { LeadRow } from "@/app/data/leads";
import { PROVIDER_CATEGORIES } from "@/lib/provider-categories";
import { formatCurrency, formatShortDate, formatWeddingDate } from "@/lib/format";
import {
  buildCotizacionLeadEmail,
  buildCotizacionLeadWhatsAppMessage,
  computeCotizacionTotals,
  openCotizacionLeadEmail,
  openCotizacionLeadWhatsApp,
  parsePrecioFromNotas,
  suggestPriceRangeFromHistory,
  type HistoricoPrecioCategoria,
} from "@/lib/cotizacion-lead";
import { supabase } from "@/lib/supabase";

type CotizacionEditorProps = {
  cotizacion: CotizacionRow;
  lead: LeadRow;
  initialItems: CotizacionItemRow[];
  directorio: DirectorioProveedorRow[];
  historico: HistoricoPrecioCategoria[];
};

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function buildDefaultItems(
  cotizacionId: string,
  initialItems: CotizacionItemRow[],
): CotizacionItemRow[] {
  const byCategoria = new Map(initialItems.map((i) => [i.categoria, i]));
  return PROVIDER_CATEGORIES.map(
    (categoria) =>
      byCategoria.get(categoria) ?? {
        id: `temp-${categoria}`,
        cotizacion_id: cotizacionId,
        categoria,
        descripcion: null,
        precio_min: null,
        precio_max: null,
        precio_fijo: null,
        es_precio_fijo: false,
        proveedor_sugerido: null,
        incluido: true,
      },
  );
}

export function CotizacionEditor({
  cotizacion,
  lead,
  initialItems,
  directorio,
  historico,
}: CotizacionEditorProps) {
  const router = useRouter();
  const normalizedInitial = useMemo(
    () => buildDefaultItems(cotizacion.id, initialItems),
    [cotizacion.id, initialItems],
  );
  const [items, setItems] = useState<CotizacionItemRow[]>(normalizedInitial);

  useEffect(() => {
    setItems(normalizedInitial);
  }, [normalizedInitial]);
  const [numeroInvitados, setNumeroInvitados] = useState(
    cotizacion.numero_invitados != null
      ? String(cotizacion.numero_invitados)
      : lead.cantidad_invitados != null
        ? String(lead.cantidad_invitados)
        : "",
  );
  const [ciudad, setCiudad] = useState(cotizacion.ciudad ?? lead.ciudad);
  const [fechaEstimada, setFechaEstimada] = useState(
    cotizacion.fecha_estimada ?? lead.fecha_tentativa,
  );
  const [notas, setNotas] = useState(cotizacion.notas ?? "");
  const [estado, setEstado] = useState<CotizacionEstado>(cotizacion.estado);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const directorioByCategoria = useMemo(() => {
    const map = new Map<string, DirectorioProveedorRow[]>();
    for (const p of directorio) {
      const list = map.get(p.categoria) ?? [];
      list.push(p);
      map.set(p.categoria, list);
    }
    return map;
  }, [directorio]);

  const itemsByCategoria = useMemo(() => {
    const map = new Map<string, CotizacionItemRow>();
    for (const item of items) {
      map.set(item.categoria, item);
    }
    return map;
  }, [items]);

  const { totalMin, totalMax } = useMemo(
    () => computeCotizacionTotals(items),
    [items],
  );

  const whatsappMessage = useMemo(
    () =>
      buildCotizacionLeadWhatsAppMessage({
        nombreLead: lead.nombre_pareja,
        numeroInvitados: numeroInvitados.trim()
          ? Number(numeroInvitados)
          : null,
        fechaEstimada: fechaEstimada || null,
        items,
      }),
    [lead.nombre_pareja, numeroInvitados, fechaEstimada, items],
  );

  function updateItem(
    categoria: string,
    patch: Partial<CotizacionItemRow>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.categoria === categoria ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSave(markEnviada = false) {
    setError(null);
    setSuccess(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    const invitados = numeroInvitados.trim() ? Number(numeroInvitados) : null;
    if (invitados !== null && (!Number.isFinite(invitados) || invitados < 0)) {
      setError("Ingresa un número de invitados válido.");
      return;
    }

    setSaving(true);
    try {
      const nuevoEstado = markEnviada ? "enviada" : estado;

      const { error: cotError } = await supabase
        .from("cotizaciones")
        .update({
          numero_invitados: invitados,
          ciudad: ciudad.trim() || null,
          fecha_estimada: fechaEstimada || null,
          notas: notas.trim() || null,
          estado: nuevoEstado,
        })
        .eq("id", cotizacion.id);

      if (cotError) {
        setError(cotError.message);
        return;
      }

      for (const item of items) {
        const categoria = item.categoria;
        const payload = {
          cotizacion_id: cotizacion.id,
          categoria,
          descripcion: item.descripcion,
          precio_min: item.precio_min,
          precio_max: item.precio_max,
          precio_fijo: item.precio_fijo,
          es_precio_fijo: item.es_precio_fijo,
          proveedor_sugerido: item.proveedor_sugerido,
          incluido: item.incluido,
        };

        if (item.id.startsWith("temp-")) {
          const { data: inserted, error: insertError } = await supabase
            .from("cotizacion_items")
            .insert(payload)
            .select("*")
            .single();
          if (insertError) {
            setError(insertError.message);
            return;
          }
          if (inserted) {
            setItems((current) =>
              current.map((i) =>
                i.categoria === categoria ? (inserted as CotizacionItemRow) : i,
              ),
            );
          }
        } else {
          const { error: updateError } = await supabase
            .from("cotizacion_items")
            .update(payload)
            .eq("id", item.id);
          if (updateError) {
            setError(updateError.message);
            return;
          }
        }
      }

      if (markEnviada) setEstado("enviada");
      setSuccess("Cotización guardada.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleEnviarWhatsApp() {
    const telefono = window.prompt(
      "Teléfono del lead (con indicativo, ej. 3001234567):",
    );
    if (!telefono?.trim()) return;

    await handleSave(true);
    const opened = openCotizacionLeadWhatsApp(telefono.trim(), whatsappMessage);
    if (!opened) {
      setError("No se pudo abrir WhatsApp. Verifica el número.");
    }
  }

  async function handleEnviarEmail() {
    const email = window.prompt("Correo del lead:");
    if (!email?.trim()) return;

    await handleSave(true);
    const { subject, body } = buildCotizacionLeadEmail({
      nombreLead: lead.nombre_pareja,
      numeroInvitados: numeroInvitados.trim()
        ? Number(numeroInvitados)
        : null,
      fechaEstimada: fechaEstimada || null,
      items,
    });
    openCotizacionLeadEmail(email.trim(), subject, body);
  }

  function applySugerencia(categoria: string) {
    const invitados = numeroInvitados.trim() ? Number(numeroInvitados) : null;
    const sugerencia = suggestPriceRangeFromHistory(
      categoria,
      invitados,
      historico,
    );
    if (!sugerencia) return;
    updateItem(categoria, {
      precio_min: sugerencia.min,
      precio_max: sugerencia.max,
      es_precio_fijo: false,
      precio_fijo: null,
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-bloom-ink">
            Cotización – {lead.nombre_pareja}
          </h1>
          <p className="mt-1 text-sm text-bloom-muted">
            Lead · {COTIZACION_ESTADO_LABELS[estado]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-60"
          >
            Enviar por WhatsApp
          </button>
          <button
            type="button"
            onClick={handleEnviarEmail}
            disabled={saving}
            className="rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border disabled:opacity-60"
          >
            Enviar por Email
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
        <h2 className="text-sm font-medium uppercase tracking-wider text-bloom-muted">
          Datos del lead
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-bloom-ink">Pareja</label>
            <p className="text-sm text-bloom-ink">{lead.nombre_pareja}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Número de invitados
            </label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={numeroInvitados}
              onChange={(e) => setNumeroInvitados(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">Ciudad</label>
            <input
              className={inputClass}
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Fecha estimada
            </label>
            <input
              type="date"
              className={inputClass}
              value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-bloom-ink">Notas</label>
            <textarea
              rows={2}
              className={inputClass}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-xl text-bloom-ink">
          Categorías de servicio
        </h2>
        {items.map((item) => {
          const categoria = item.categoria;
          const proveedoresDir = directorioByCategoria.get(categoria) ?? [];
          const invitados = numeroInvitados.trim()
            ? Number(numeroInvitados)
            : null;
          const sugerencia = suggestPriceRangeFromHistory(
            categoria,
            invitados,
            historico,
          );

          return (
            <CategoriaItemCard
              key={categoria}
              categoria={categoria}
              item={item}
              proveedoresDir={proveedoresDir}
              sugerencia={sugerencia}
              saving={saving}
              onUpdate={(patch) => updateItem(categoria, patch)}
              onApplySugerencia={() => applySugerencia(categoria)}
            />
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
        <h2 className="font-display text-xl text-bloom-ink">Resumen</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-bloom-muted">Total mínimo estimado</dt>
            <dd className="text-2xl font-semibold text-bloom-ink">
              {formatCurrency(totalMin)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-bloom-muted">Total máximo estimado</dt>
            <dd className="text-2xl font-semibold text-bloom-ink">
              {formatCurrency(totalMax)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-bloom-muted">
          Fecha mostrada al cliente:{" "}
          {fechaEstimada
            ? formatWeddingDate(fechaEstimada)
            : "Sin definir"}{" "}
          · {formatShortDate(fechaEstimada || lead.fecha_tentativa)}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-bloom-border bg-bloom-canvas/60 p-4">
        <h3 className="text-sm font-medium text-bloom-ink">
          Vista previa del mensaje
        </h3>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-bloom-ink">
          {whatsappMessage}
        </pre>
      </section>
    </div>
  );
}

function CategoriaItemCard({
  categoria,
  item,
  proveedoresDir,
  sugerencia,
  saving,
  onUpdate,
  onApplySugerencia,
}: {
  categoria: string;
  item: CotizacionItemRow;
  proveedoresDir: DirectorioProveedorRow[];
  sugerencia: ReturnType<typeof suggestPriceRangeFromHistory>;
  saving: boolean;
  onUpdate: (patch: Partial<CotizacionItemRow>) => void;
  onApplySugerencia: () => void;
}) {
  const tieneDirectorio = proveedoresDir.length > 0;
  const proveedorSeleccionado = item.proveedor_sugerido ?? "";

  function handleProveedorChange(nombre: string) {
    if (!nombre) {
      onUpdate({
        proveedor_sugerido: null,
        es_precio_fijo: false,
        precio_fijo: null,
      });
      return;
    }

    const prov = proveedoresDir.find((p) => p.nombre === nombre);
    const precioNotas = prov ? parsePrecioFromNotas(prov.notas) : null;

    if (precioNotas != null) {
      onUpdate({
        proveedor_sugerido: nombre,
        es_precio_fijo: true,
        precio_fijo: precioNotas,
        precio_min: null,
        precio_max: null,
      });
    } else {
      onUpdate({
        proveedor_sugerido: nombre,
        es_precio_fijo: true,
        precio_fijo: item.precio_fijo,
        precio_min: null,
        precio_max: null,
      });
    }
  }

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        item.incluido
          ? "border-bloom-border bg-bloom-surface"
          : "border-dashed border-bloom-border bg-bloom-canvas/40 opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium text-bloom-ink">{categoria}</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-bloom-ink">
          <input
            type="checkbox"
            checked={item.incluido}
            onChange={(e) => onUpdate({ incluido: e.target.checked })}
            disabled={saving}
            className="h-4 w-4 rounded border-bloom-border text-bloom-accent focus:ring-bloom-accent/30"
          />
          Incluir
        </label>
      </div>

      {item.incluido && (
        <div className="mt-4 space-y-3">
          {sugerencia && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bloom-canvas px-3 py-2 text-xs text-bloom-muted">
              <span>
                Sugerencia ({sugerencia.muestras}{" "}
                {sugerencia.muestras === 1 ? "boda similar" : "bodas similares"}
                ): {formatCurrency(sugerencia.min)} –{" "}
                {formatCurrency(sugerencia.max)}
              </span>
              <button
                type="button"
                onClick={onApplySugerencia}
                disabled={saving}
                className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink hover:bg-bloom-border disabled:opacity-60"
              >
                Aplicar sugerencia
              </button>
            </div>
          )}

          {tieneDirectorio ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Proveedor del directorio
              </label>
              <select
                className={inputClass}
                value={proveedorSeleccionado}
                onChange={(e) => handleProveedorChange(e.target.value)}
                disabled={saving}
              >
                <option value="">Rango manual (sin proveedor fijo)</option>
                {proveedoresDir.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre}
                    {parsePrecioFromNotas(p.notas) != null
                      ? ` · ${formatCurrency(parsePrecioFromNotas(p.notas)!)}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {item.es_precio_fijo && item.proveedor_sugerido ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Precio fijo (COP)
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={item.precio_fijo ?? ""}
                onChange={(e) =>
                  onUpdate({
                    precio_fijo: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
                disabled={saving}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-bloom-ink">
                  Precio mínimo (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.precio_min ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      precio_min: e.target.value ? Number(e.target.value) : null,
                      es_precio_fijo: false,
                    })
                  }
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-bloom-ink">
                  Precio máximo (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={item.precio_max ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      precio_max: e.target.value ? Number(e.target.value) : null,
                      es_precio_fijo: false,
                    })
                  }
                  disabled={saving}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Descripción (opcional)
            </label>
            <input
              className={inputClass}
              value={item.descripcion ?? ""}
              onChange={(e) =>
                onUpdate({ descripcion: e.target.value || null })
              }
              disabled={saving}
              placeholder="Detalle del servicio"
            />
          </div>
        </div>
      )}
    </article>
  );
}
