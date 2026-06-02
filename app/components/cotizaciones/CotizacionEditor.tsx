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
import {
  getBaseCategoria,
  normalizeProviderCategory,
  PROVIDER_CATEGORIES,
} from "@/lib/provider-categories";
import {
  formatCurrency,
  formatShortDateStable,
  formatWeddingDate,
} from "@/lib/format";
import {
  buildCotizacionLeadEmail,
  buildCotizacionLeadWhatsAppMessage,
  computeCotizacionTotal,
  openCotizacionLeadEmail,
  openCotizacionLeadWhatsApp,
  parsePrecioFromNotas,
  suggestPrecioFromHistory,
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

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

function createTempItem(
  cotizacionId: string,
  categoria: string,
): CotizacionItemRow {
  return {
    id: `temp-${categoria}-${Math.random().toString(36).slice(2, 9)}`,
    cotizacion_id: cotizacionId,
    categoria,
    descripcion: null,
    precio_estimado: null,
    proveedor_sugerido_id: null,
    notas_internas: null,
    incluido: true,
  };
}

function buildDefaultItems(
  cotizacionId: string,
  initialItems: CotizacionItemRow[],
): CotizacionItemRow[] {
  const usedIds = new Set<string>();
  const items: CotizacionItemRow[] = [];

  for (const categoria of PROVIDER_CATEGORIES) {
    const matching = initialItems.filter(
      (item) => getBaseCategoria(item.categoria) === categoria,
    );

    if (matching.length > 0) {
      for (const item of matching) {
        items.push(item);
        usedIds.add(item.id);
      }
    } else {
      items.push(createTempItem(cotizacionId, categoria));
    }
  }

  for (const item of initialItems) {
    if (!usedIds.has(item.id)) {
      items.push(item);
    }
  }

  return items;
}

function getSiblingItems(
  items: CotizacionItemRow[],
  baseCategoria: string,
): CotizacionItemRow[] {
  return items.filter(
    (item) => getBaseCategoria(item.categoria) === baseCategoria,
  );
}

function getNextDuplicateLabel(
  baseCategoria: string,
  siblings: CotizacionItemRow[],
): string {
  const numbers = siblings.map((item) => {
    if (item.categoria === baseCategoria) return 1;
    const match = item.categoria.match(/\s+(\d+)$/);
    return match ? Number(match[1]) : 1;
  });
  const next = Math.max(...numbers, 0) + 1;
  return `${baseCategoria} ${next}`;
}

function duplicateCategoryItem(
  items: CotizacionItemRow[],
  sourceItem: CotizacionItemRow,
): CotizacionItemRow[] {
  const baseCategoria = getBaseCategoria(sourceItem.categoria);
  const siblings = getSiblingItems(items, baseCategoria);

  let nextItems = [...items];

  if (siblings.length === 1 && siblings[0].categoria === baseCategoria) {
    nextItems = nextItems.map((item) =>
      item.id === siblings[0].id
        ? { ...item, categoria: `${baseCategoria} 1` }
        : item,
    );
  }

  const updatedSiblings = getSiblingItems(nextItems, baseCategoria);
  const newLabel = getNextDuplicateLabel(baseCategoria, updatedSiblings);

  nextItems.push(
    createTempItem(sourceItem.cotizacion_id, newLabel),
  );

  return nextItems;
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
      const key = getBaseCategoria(normalizeProviderCategory(p.categoria));
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [directorio]);

  const totalEstimado = useMemo(() => computeCotizacionTotal(items), [items]);

  const whatsappMessage = useMemo(
    () =>
      buildCotizacionLeadWhatsAppMessage({
        nombreLead: lead.nombre_pareja,
        numeroInvitados: numeroInvitados.trim()
          ? Number(numeroInvitados)
          : null,
        fechaEstimada: fechaEstimada || null,
        ciudad: ciudad.trim() || lead.ciudad,
        items,
      }),
    [lead.nombre_pareja, lead.ciudad, numeroInvitados, fechaEstimada, ciudad, items],
  );

  function updateItem(
    itemId: string,
    patch: Partial<CotizacionItemRow>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    );
  }

  function handleDuplicateItem(sourceItem: CotizacionItemRow) {
    setItems((current) => duplicateCategoryItem(current, sourceItem));
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
          precio_estimado: item.precio_estimado,
          proveedor_sugerido_id: item.proveedor_sugerido_id,
          notas_internas: item.notas_internas?.trim() || null,
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
                i.id === item.id ? (inserted as CotizacionItemRow) : i,
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
      ciudad: ciudad.trim() || lead.ciudad,
      items,
    });
    openCotizacionLeadEmail(email.trim(), subject, body);
  }

  function applySugerencia(itemId: string, categoria: string) {
    const invitados = numeroInvitados.trim() ? Number(numeroInvitados) : null;
    const sugerencia = suggestPrecioFromHistory(categoria, invitados, historico);
    if (!sugerencia) return;
    updateItem(itemId, { precio_estimado: sugerencia.precio });
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
          const baseCategoria = getBaseCategoria(categoria);
          const proveedoresDir = directorioByCategoria.get(baseCategoria) ?? [];
          const invitados = numeroInvitados.trim()
            ? Number(numeroInvitados)
            : null;
          const sugerencia = suggestPrecioFromHistory(
            categoria,
            invitados,
            historico,
          );

          return (
            <CategoriaItemCard
              key={item.id}
              categoria={categoria}
              item={item}
              proveedoresDir={proveedoresDir}
              sugerencia={sugerencia}
              saving={saving}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onApplySugerencia={() => applySugerencia(item.id, categoria)}
              onDuplicate={() => handleDuplicateItem(item)}
            />
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
        <h2 className="font-display text-xl text-bloom-ink">Resumen</h2>
        <p className="mt-4 text-sm text-bloom-muted">Total estimado</p>
        <p className="text-3xl font-semibold text-bloom-ink">
          {formatCurrency(totalEstimado)}
        </p>
        <p className="mt-3 text-xs text-bloom-muted">
          Fecha mostrada al cliente:{" "}
          {fechaEstimada
            ? formatWeddingDate(fechaEstimada)
            : "Sin definir"}{" "}
          · {formatShortDateStable(fechaEstimada || lead.fecha_tentativa)}
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
  onDuplicate,
}: {
  categoria: string;
  item: CotizacionItemRow;
  proveedoresDir: DirectorioProveedorRow[];
  sugerencia: ReturnType<typeof suggestPrecioFromHistory>;
  saving: boolean;
  onUpdate: (patch: Partial<CotizacionItemRow>) => void;
  onApplySugerencia: () => void;
  onDuplicate: () => void;
}) {
  const proveedorInterno = item.proveedor_sugerido_id
    ? proveedoresDir.find((p) => p.id === item.proveedor_sugerido_id)
    : null;

  function handleProveedorInternoChange(proveedorId: string) {
    if (!proveedorId) {
      onUpdate({ proveedor_sugerido_id: null });
      return;
    }

    const prov = proveedoresDir.find((p) => p.id === proveedorId);
    const precioNotas = prov ? parsePrecioFromNotas(prov.notas) : null;

    onUpdate({
      proveedor_sugerido_id: proveedorId,
      precio_estimado: precioNotas ?? item.precio_estimado,
    });
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            disabled={saving}
            title={`Agregar otra línea de ${getBaseCategoria(categoria)}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface text-lg font-medium leading-none text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
            aria-label={`Agregar ${getBaseCategoria(categoria)}`}
          >
            +
          </button>
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
      </div>

      {item.incluido && (
        <div className="mt-4 space-y-3">
          {sugerencia && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bloom-canvas px-3 py-2 text-xs text-bloom-muted">
              <span>
                Sugerencia ({sugerencia.muestras}{" "}
                {sugerencia.muestras === 1 ? "boda similar" : "bodas similares"}
                ): {formatCurrency(sugerencia.precio)}
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

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-bloom-ink">
              Precio estimado (COP)
            </label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={item.precio_estimado ?? ""}
              onChange={(e) =>
                onUpdate({
                  precio_estimado: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              disabled={saving}
            />
          </div>

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

          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/80 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                Uso interno del equipo
              </p>
              <span className="inline-flex rounded-full bg-bloom-border/80 px-2 py-0.5 text-[10px] font-medium text-bloom-muted">
                Solo visible para el equipo
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Proveedor sugerido
              </label>
              {proveedoresDir.length > 0 ? (
                <select
                  className={inputClass}
                  value={item.proveedor_sugerido_id ?? ""}
                  onChange={(e) => handleProveedorInternoChange(e.target.value)}
                  disabled={saving}
                >
                  <option value="">Sin proveedor sugerido</option>
                  {proveedoresDir.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {parsePrecioFromNotas(p.notas) != null
                        ? ` · ref. ${formatCurrency(parsePrecioFromNotas(p.notas)!)}`
                        : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-bloom-muted">
                  No hay proveedores en el directorio para esta categoría.
                </p>
              )}
              {proveedorInterno && (
                <p className="text-sm text-bloom-ink">
                  <span className="font-medium">{proveedorInterno.nombre}</span>
                  <span className="ml-2 inline-flex rounded-full bg-bloom-border/80 px-2 py-0.5 text-[10px] font-medium text-bloom-muted">
                    Solo visible para el equipo
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-bloom-ink">
                Notas internas
              </label>
              <textarea
                rows={2}
                className={textareaClass}
                value={item.notas_internas ?? ""}
                onChange={(e) =>
                  onUpdate({ notas_internas: e.target.value || null })
                }
                disabled={saving}
                placeholder="Notas para el equipo (no se envían al cliente)"
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
