"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgregarProveedorSugeridoModal } from "@/app/components/bodas/AgregarProveedorSugeridoModal";
import { SugerirProveedoresAutomaticosModal } from "@/app/components/bodas/SugerirProveedoresAutomaticosModal";
import {
  getMaxProveedorSugeridoRonda,
  normalizeProveedorSugeridoRow,
  sortProveedoresSugeridos,
  type ProveedorSugeridoWithSelection,
} from "@/app/data/proveedores-sugeridos";
import type { UserRole } from "@/lib/auth/roles";
import { AUDITORIA_ACCIONES, logAuditoria } from "@/lib/auditoria";
import {
  buildInstagramUrl,
  canManageProveedoresSugeridos,
  formatInstagramDisplay,
  groupProveedoresSugeridosByRonda,
} from "@/lib/proveedores-sugeridos";
import {
  sugerenciasAutomaticasToPreview,
  type SugerenciasAutomaticasResult,
} from "@/lib/proveedores-sugeridos-automaticos";
import { supabase } from "@/lib/supabase";

type ProveedoresSugeridosSectionProps = {
  bodaId: string;
  bodaNombre: string;
  initialProveedores: ProveedorSugeridoWithSelection[];
  role: UserRole;
  currentUserId: string;
  embedded?: boolean;
};

export function ProveedoresSugeridosSection({
  bodaId,
  bodaNombre,
  initialProveedores,
  role,
  currentUserId,
  embedded = false,
}: ProveedoresSugeridosSectionProps) {
  const router = useRouter();
  const canManage = canManageProveedoresSugeridos(role);
  const [proveedores, setProveedores] = useState(() =>
    sortProveedoresSugeridos(initialProveedores),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState<{
    categorias: ReturnType<typeof sugerenciasAutomaticasToPreview>;
    ronda: number;
  } | null>(null);
  const [activeRonda, setActiveRonda] = useState(() =>
    getMaxProveedorSugeridoRonda(initialProveedores),
  );

  const grouped = useMemo(
    () => groupProveedoresSugeridosByRonda(proveedores),
    [proveedores],
  );

  const seleccionadosCount = useMemo(
    () => proveedores.filter((item) => item.seleccionado).length,
    [proveedores],
  );

  async function handleAddSuggestion(payload: {
    directorio_proveedor_id: string | null;
    nombre_proveedor: string;
    categoria: string;
    instagram: string | null;
    ronda: number;
  }) {
    if (!supabase) {
      throw new Error("Supabase no está configurado.");
    }

    const orden =
      proveedores.filter(
        (item) =>
          item.ronda === payload.ronda && item.categoria === payload.categoria,
      ).length;

    const { data, error: insertError } = await supabase
      .from("proveedores_sugeridos")
      .insert({
        boda_id: bodaId,
        directorio_proveedor_id: payload.directorio_proveedor_id,
        nombre_proveedor: payload.nombre_proveedor,
        categoria: payload.categoria,
        instagram: payload.instagram,
        ronda: payload.ronda,
        orden,
        created_by: currentUserId,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      throw new Error(
        insertError?.message ?? "No se pudo agregar la sugerencia.",
      );
    }

    const nextItem: ProveedorSugeridoWithSelection = {
      ...normalizeProveedorSugeridoRow(data),
      seleccionado: false,
    };

    setProveedores((current) =>
      sortProveedoresSugeridos([...current, nextItem]),
    );
    setActiveRonda(payload.ronda);

    await logAuditoria({
      accion: AUDITORIA_ACCIONES.PROVEEDOR_SUGERIDO_AGREGADO,
      entidad: "proveedor_sugerido",
      entidadId: nextItem.id,
      bodaNombre,
      detalle: `${payload.nombre_proveedor} · ${payload.categoria} · Ronda ${payload.ronda}`,
    });

    router.refresh();
  }

  function handleNuevaRonda() {
    const nextRonda = getMaxProveedorSugeridoRonda(proveedores) + 1;
    setActiveRonda(nextRonda);
    setModalOpen(true);
  }

  async function handleSugerirAutomaticamente() {
    setAutoLoading(true);
    setAutoError(null);

    try {
      const response = await fetch(`/api/bodas/${bodaId}/sugerir-proveedores`, {
        method: "POST",
      });
      const data = (await response.json()) as
        | SugerenciasAutomaticasResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "No se pudieron generar las sugerencias.",
        );
      }

      const result = data as SugerenciasAutomaticasResult;
      setAutoPreview({
        categorias: sugerenciasAutomaticasToPreview(result),
        ronda: result.ronda_propuesta,
      });
      setAutoModalOpen(true);
    } catch (suggestError) {
      setAutoError(
        suggestError instanceof Error
          ? suggestError.message
          : "No se pudieron generar las sugerencias.",
      );
    } finally {
      setAutoLoading(false);
    }
  }

  async function handleConfirmAutomaticSuggestions(
    items: Array<{
      directorio_proveedor_id: string | null;
      nombre_proveedor: string;
      categoria: string;
      instagram: string | null;
      ronda: number;
      orden: number;
    }>,
  ) {
    if (!supabase) {
      throw new Error("Supabase no está configurado.");
    }

    const { data, error: insertError } = await supabase
      .from("proveedores_sugeridos")
      .insert(
        items.map((item) => ({
          boda_id: bodaId,
          directorio_proveedor_id: item.directorio_proveedor_id,
          nombre_proveedor: item.nombre_proveedor,
          categoria: item.categoria,
          instagram: item.instagram,
          ronda: item.ronda,
          orden: item.orden,
          created_by: currentUserId,
        })),
      )
      .select("*");

    if (insertError || !data) {
      throw new Error(
        insertError?.message ?? "No se pudieron guardar las sugerencias.",
      );
    }

    const inserted = data.map((row) => ({
      ...normalizeProveedorSugeridoRow(row),
      seleccionado: false,
    }));

    setProveedores((current) =>
      sortProveedoresSugeridos([...current, ...inserted]),
    );
    setActiveRonda(items[0]?.ronda ?? activeRonda);

    await logAuditoria({
      accion: AUDITORIA_ACCIONES.PROVEEDOR_SUGERIDO_AGREGADO,
      entidad: "proveedor_sugerido",
      bodaNombre,
      detalle: `Sugerencias automáticas · Ronda ${items[0]?.ronda ?? activeRonda} · ${inserted.length} proveedores`,
    });

    router.refresh();
  }

  const Shell = embedded ? "div" : "section";
  const shellClass = embedded
    ? "space-y-5"
    : "rounded-xl border border-bloom-border bg-bloom-surface p-5 shadow-sm sm:p-6";

  return (
    <Shell className={shellClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-bloom-muted">
            {proveedores.length}{" "}
            {proveedores.length === 1 ? "sugerencia" : "sugerencias"}
            {seleccionadosCount > 0 && (
              <span>
                {" "}
                · {seleccionadosCount} marcada
                {seleccionadosCount === 1 ? "" : "s"} por el cliente
              </span>
            )}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSugerirAutomaticamente}
              disabled={autoLoading}
              className="rounded-full border border-bloom-accent/40 bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-accent transition-colors hover:bg-bloom-accent/10 disabled:opacity-60"
            >
              {autoLoading ? "Generando…" : "✨ Sugerir automáticamente"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-bloom-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
            >
              Agregar sugerencia
            </button>
            <button
              type="button"
              onClick={handleNuevaRonda}
              className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
            >
              Nueva ronda
            </button>
          </div>
        )}
      </div>

      {autoError && (
        <p className="text-sm text-red-700" role="alert">
          {autoError}
        </p>
      )}

      {proveedores.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay proveedores sugeridos para esta boda.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((rondaGroup) => (
            <div key={rondaGroup.ronda}>
              <h3 className="font-display text-lg text-bloom-accent">
                Ronda {rondaGroup.ronda}
              </h3>
              <div className="mt-4 space-y-6">
                {rondaGroup.categorias.map((categoriaGroup) => (
                  <div key={`${rondaGroup.ronda}-${categoriaGroup.categoria}`}>
                    <h4 className="text-sm font-medium uppercase tracking-[0.12em] text-bloom-muted">
                      {categoriaGroup.categoria}
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {categoriaGroup.proveedores.map((proveedor) => {
                        const instagramUrl = buildInstagramUrl(proveedor.instagram);

                        return (
                          <li
                            key={proveedor.id}
                            className="flex items-start justify-between gap-3 rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-bloom-ink">
                                  {proveedor.nombre_proveedor}
                                </p>
                                {proveedor.sugerido_por_ia && (
                                  <span className="inline-flex shrink-0 rounded-full bg-bloom-accent/10 px-2 py-0.5 text-xs font-medium text-bloom-accent">
                                    ✨ Sugerido por IA
                                  </span>
                                )}
                              </div>
                              {instagramUrl && (
                                <a
                                  href={instagramUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-block text-sm text-bloom-accent underline decoration-bloom-accent/40 underline-offset-2"
                                >
                                  {formatInstagramDisplay(proveedor.instagram)}
                                </a>
                              )}
                            </div>
                            <span
                              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm ${
                                proveedor.seleccionado
                                  ? "border-bloom-success bg-bloom-success/10 text-bloom-success"
                                  : "border-bloom-border bg-bloom-surface text-bloom-muted"
                              }`}
                              title={
                                proveedor.seleccionado
                                  ? "Marcado por el cliente"
                                  : "Sin marcar por el cliente"
                              }
                              aria-label={
                                proveedor.seleccionado
                                  ? "Marcado por el cliente"
                                  : "Sin marcar por el cliente"
                              }
                            >
                              {proveedor.seleccionado ? "✓" : "—"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <>
          <AgregarProveedorSugeridoModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            defaultRonda={activeRonda}
            onSubmit={handleAddSuggestion}
          />
          {autoPreview && (
            <SugerirProveedoresAutomaticosModal
              open={autoModalOpen}
              onClose={() => setAutoModalOpen(false)}
              categorias={autoPreview.categorias}
              ronda={autoPreview.ronda}
              onConfirm={handleConfirmAutomaticSuggestions}
            />
          )}
        </>
      )}
    </Shell>
  );
}
