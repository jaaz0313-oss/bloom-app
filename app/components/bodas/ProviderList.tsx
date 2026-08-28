"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NotaReunionRow } from "@/app/data/notas-reunion";
import type { PagoRow } from "@/app/data/pagos";
import {
  buildPresupuestoTotalLineas,
  dedupePresupuestoEstimadosByCategoria,
  sumPresupuestoTotalEstimado,
  type PresupuestoEstimadoCategoriaRow,
} from "@/app/data/presupuesto-estimado";
import {
  dedupeProveedoresPorGrupo,
  isProveedorSinCosto,
  hasProveedorValorDefinido,
  type ProveedorRow,
} from "@/app/data/providers";
import {
  canManageClientePortalFlags,
  hasPermission,
  type UserRole,
} from "@/lib/auth/roles";
import { persistProviderOrden } from "@/lib/provider-orden";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import { formatCurrency } from "@/lib/format";
import { CompararCotizacionesBar } from "./CompararCotizacionesBar";
import { EstimadoItemCard } from "./EstimadoItemCard";
import { ProviderCard, type ProviderDragHandleProps } from "./ProviderCard";

type ProviderListProps = {
  providers: ProveedorRow[];
  estimados?: PresupuestoEstimadoCategoriaRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  currentUserId: string;
  pagosByProveedor: Record<string, PagoRow[]>;
  notasReunionByProveedor: Record<string, NotaReunionRow[]>;
  role: UserRole;
  whatsappGrupoLink?: string | null;
  highlightProveedorId?: string | null;
  driveFolderUrl?: string | null;
  onProviderUpdated?: (updated: ProveedorRow) => void;
  onEstimadoDeleted?: (id: string) => void;
  /** IDs de proveedores con aprobación pendiente del cliente. */
  aprobadoPorClienteIds?: string[];
};

function compareProvidersByOrden(a: ProveedorRow, b: ProveedorRow): number {
  const ao = a.orden ?? Number.MAX_SAFE_INTEGER;
  const bo = b.orden ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.created_at.localeCompare(b.created_at);
}

function sortVisibleProviders(providers: ProveedorRow[]): ProveedorRow[] {
  const visible = providers.filter((provider) => provider.estado !== "descartado");
  const hasOrden = visible.some((provider) => provider.orden != null);

  if (hasOrden) {
    return [...visible].sort(compareProvidersByOrden);
  }

  return [...visible].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function ProviderList({
  providers,
  estimados = [],
  bodaId,
  boda,
  plannerName,
  currentUserId,
  pagosByProveedor,
  notasReunionByProveedor,
  role,
  whatsappGrupoLink = null,
  highlightProveedorId = null,
  driveFolderUrl = null,
  onProviderUpdated,
  onEstimadoDeleted,
  aprobadoPorClienteIds = [],
}: ProviderListProps) {
  const canReorder = hasPermission(role, "providers.manage");
  const canDeleteEstimado = canManageClientePortalFlags(role);
  const estimadosUnicos = useMemo(
    () => dedupePresupuestoEstimadosByCategoria(estimados),
    [estimados],
  );
  const aprobadoPorClienteSet = useMemo(
    () => new Set(aprobadoPorClienteIds),
    [aprobadoPorClienteIds],
  );
  const sortedFromProps = useMemo(
    () => sortVisibleProviders(providers),
    [providers],
  );

  const [orderedList, setOrderedList] = useState(sortedFromProps);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  function handleProviderUpdated(updated: ProveedorRow) {
    console.log("[ProviderList] handleProviderUpdated", {
      id: updated.id,
      valor_total: updated.valor_total,
      hasParentCallback: typeof onProviderUpdated === "function",
    });
    setOrderedList((prev) => {
      const next = prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      );
      console.log(
        "[ProviderList] orderedList after update",
        next.find((item) => item.id === updated.id)?.valor_total,
      );
      return next;
    });
    onProviderUpdated?.(updated);
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    console.log(
      "[ProviderList] sync orderedList from props",
      sortedFromProps.map((p) => ({ id: p.id, valor_total: p.valor_total })),
    );
    setOrderedList(sortedFromProps);
  }, [sortedFromProps]);

  useEffect(() => {
    if (!highlightProveedorId) return;
    const el = document.getElementById(`proveedor-${highlightProveedorId}`);
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightProveedorId, orderedList]);

  const descartadosCount = providers.length - sortedFromProps.length;
  const usesOrden = sortedFromProps.some((provider) => provider.orden != null);
  const showFlatList = canReorder || usesOrden;

  const providersByCategoria = useMemo(() => {
    const map = new Map<string, ProveedorRow[]>();
    for (const provider of sortedFromProps) {
      const list = map.get(provider.categoria) ?? [];
      list.push(provider);
      map.set(provider.categoria, list);
    }
    return Array.from(map.entries());
  }, [sortedFromProps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedList.findIndex((item) => item.id === active.id);
    const newIndex = orderedList.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderedList, oldIndex, newIndex);
    setOrderedList(next);
    setReorderError(null);
    setIsSavingOrder(true);

    const result = await persistProviderOrden(next);
    setIsSavingOrder(false);

    if (!result.ok) {
      setReorderError(result.message);
      setOrderedList(sortedFromProps);
    }
  }

  if (providers.length === 0 && estimados.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
        Aún no hay proveedores registrados para esta boda.
      </p>
    );
  }

  function renderEstimadosList() {
    if (estimadosUnicos.length === 0) return null;
    return (
      <div className="space-y-3 border-t border-bloom-border/70 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-bloom-muted">
          Ítems estimados
        </p>
        <ul className="space-y-3">
          {estimadosUnicos.map((item) => (
            <li key={item.id}>
              <EstimadoItemCard
                item={item}
                allEstimados={estimados}
                canDelete={canDeleteEstimado}
                onDeleted={(ids) => {
                  for (const id of ids) onEstimadoDeleted?.(id);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="space-y-4">
        <ProviderListSummary providers={[]} estimados={estimadosUnicos} />
        {renderEstimadosList()}
      </div>
    );
  }

  function renderStaticProviderItem(provider: ProveedorRow, extra?: ReactNode) {
    return (
      <li
        key={provider.id}
        id={`proveedor-${provider.id}`}
        className={
          highlightProveedorId === provider.id
            ? "scroll-mt-24 space-y-3 rounded-2xl ring-2 ring-bloom-accent/40 ring-offset-2"
            : "scroll-mt-24 space-y-3"
        }
      >
        {extra}
        <ProviderCard
          provider={provider}
          allProviders={sortedFromProps}
          bodaId={bodaId}
          boda={boda}
          plannerName={plannerName}
          pagos={pagosByProveedor[provider.id] ?? []}
          pagosByProveedor={pagosByProveedor}
          notasReunion={notasReunionByProveedor[provider.id] ?? []}
          currentUserId={currentUserId}
          role={role}
          driveFolderUrl={driveFolderUrl}
          onProviderUpdated={handleProviderUpdated}
          aprobadoPorCliente={aprobadoPorClienteSet.has(provider.id)}
        />
      </li>
    );
  }

  function renderFlatList(list: ProveedorRow[], sortable: boolean) {
    const enNegociacionByCategoria = new Map<string, ProveedorRow[]>();
    for (const provider of list) {
      if (provider.estado !== "en_negociacion") continue;
      const categoryList = enNegociacionByCategoria.get(provider.categoria) ?? [];
      categoryList.push(provider);
      enNegociacionByCategoria.set(provider.categoria, categoryList);
    }

    const compareShown = new Set<string>();
    const items = list.map((provider) => {
      const enNegociacion =
        enNegociacionByCategoria.get(provider.categoria) ?? [];
      const showCompare =
        enNegociacion.length >= 2 && !compareShown.has(provider.categoria);

      if (showCompare) {
        compareShown.add(provider.categoria);
      }

      const compareBar = showCompare ? (
        <CompararCotizacionesBar
          categoria={provider.categoria}
          proveedores={enNegociacion}
          grupoLink={whatsappGrupoLink}
        />
      ) : null;

      if (sortable) {
        return (
          <SortableProviderItem
            key={provider.id}
            provider={provider}
            allProviders={sortedFromProps}
            bodaId={bodaId}
            boda={boda}
            plannerName={plannerName}
            pagos={pagosByProveedor[provider.id] ?? []}
            pagosByProveedor={pagosByProveedor}
            notasReunion={notasReunionByProveedor[provider.id] ?? []}
            currentUserId={currentUserId}
            role={role}
            highlightProveedorId={highlightProveedorId}
            compareBar={compareBar}
            driveFolderUrl={driveFolderUrl}
            onProviderUpdated={handleProviderUpdated}
            aprobadoPorCliente={aprobadoPorClienteSet.has(provider.id)}
          />
        );
      }

      return renderStaticProviderItem(provider, compareBar);
    });

    if (sortable) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: {
              onDragStart: () => "",
              onDragOver: () => "",
              onDragEnd: () => "",
              onDragCancel: () => "",
            },
          }}
        >
          <SortableContext
            items={list.map((provider) => provider.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">{items}</ul>
          </SortableContext>
        </DndContext>
      );
    }

    return <ul className="space-y-3">{items}</ul>;
  }

  return (
    <div className="space-y-6">
      {descartadosCount > 0 && (
        <p className="text-xs text-bloom-muted">
          {descartadosCount}{" "}
          {descartadosCount === 1
            ? "proveedor descartado oculto"
            : "proveedores descartados ocultos"}
        </p>
      )}

      {canReorder && isSavingOrder && (
        <p className="text-xs text-bloom-muted">Guardando orden…</p>
      )}

      {reorderError && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          role="alert"
        >
          {reorderError}
        </p>
      )}

      {showFlatList ? (
        renderFlatList(orderedList, canReorder && isMounted)
      ) : (
        providersByCategoria.map(([categoria, categoriaProviders]) => {
          const enNegociacion = categoriaProviders.filter(
            (provider) => provider.estado === "en_negociacion",
          );
          const showCompare = enNegociacion.length >= 2;

          return (
            <section key={categoria}>
              {showCompare && (
                <CompararCotizacionesBar
                  categoria={categoria}
                  proveedores={enNegociacion}
                  grupoLink={whatsappGrupoLink}
                />
              )}
              <ul className="space-y-3">
                {categoriaProviders.map((provider) =>
                  renderStaticProviderItem(provider),
                )}
              </ul>
            </section>
          );
        })
      )}

      <ProviderListSummary
        providers={sortedFromProps}
        estimados={estimadosUnicos}
      />

      {renderEstimadosList()}
    </div>
  );
}

function ProviderListSummary({
  providers,
  estimados,
}: {
  providers: ProveedorRow[];
  estimados: PresupuestoEstimadoCategoriaRow[];
}) {
  const lineas = buildPresupuestoTotalLineas(providers, estimados);
  const totalEstimado = sumPresupuestoTotalEstimado(lineas);

  const conCosto = dedupeProveedoresPorGrupo(
    providers.filter((provider) => !isProveedorSinCosto(provider)),
  );
  const totalContratado = conCosto
    .filter((provider) => provider.estado === "contratado")
    .reduce(
      (sum, provider) =>
        sum +
        (hasProveedorValorDefinido(provider.valor_total)
          ? provider.valor_total
          : 0),
      0,
    );

  if (totalEstimado <= 0 && totalContratado <= 0) return null;

  const contratadoLines = lineas.filter((l) => l.estado === "contratado");
  const evaluacionLines = lineas.filter((l) => l.estado === "en_evaluacion");
  const estimadoLines = lineas.filter((l) => l.estado === "estimado");
  const sumEstado = (list: typeof lineas) =>
    list.reduce((sum, line) => sum + (line.valor > 0 ? line.valor : 0), 0);

  return (
    <div className="border-t border-bloom-border/70 pt-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-bloom-muted">Contratados</dt>
          <dd className="mt-0.5 font-medium text-bloom-success">
            {formatCurrency(sumEstado(contratadoLines))}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">En evaluación</dt>
          <dd className="mt-0.5 font-medium text-bloom-ink">
            {formatCurrency(sumEstado(evaluacionLines))}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">Ítems estimados</dt>
          <dd className="mt-0.5 font-medium text-bloom-ink">
            {formatCurrency(sumEstado(estimadoLines))}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">Total estimado</dt>
          <dd className="mt-0.5 font-display text-lg text-bloom-ink">
            {formatCurrency(totalEstimado)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

type SortableProviderItemProps = {
  provider: ProveedorRow;
  allProviders: ProveedorRow[];
  bodaId: string;
  boda: CotizacionBodaContext;
  plannerName: string;
  pagos: PagoRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
  notasReunion: NotaReunionRow[];
  currentUserId: string;
  role: UserRole;
  highlightProveedorId: string | null;
  compareBar: ReactNode;
  driveFolderUrl?: string | null;
  onProviderUpdated?: (updated: ProveedorRow) => void;
  aprobadoPorCliente?: boolean;
};

function SortableProviderItem({
  provider,
  allProviders,
  bodaId,
  boda,
  plannerName,
  pagos,
  pagosByProveedor,
  notasReunion,
  currentUserId,
  role,
  highlightProveedorId,
  compareBar,
  driveFolderUrl = null,
  onProviderUpdated,
  aprobadoPorCliente = false,
}: SortableProviderItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    opacity: isDragging ? 0.92 : undefined,
  };

  const dragHandle: ProviderDragHandleProps = {
    setActivatorNodeRef,
    attributes,
    listeners,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      id={`proveedor-${provider.id}`}
      className={
        highlightProveedorId === provider.id
          ? "scroll-mt-24 space-y-3 rounded-2xl ring-2 ring-bloom-accent/40 ring-offset-2"
          : "scroll-mt-24 space-y-3"
      }
    >
      {compareBar}
      <ProviderCard
        provider={provider}
        allProviders={allProviders}
        bodaId={bodaId}
        boda={boda}
        plannerName={plannerName}
        pagos={pagos}
        pagosByProveedor={pagosByProveedor}
        notasReunion={notasReunion}
        currentUserId={currentUserId}
        role={role}
        dragHandle={dragHandle}
        driveFolderUrl={driveFolderUrl}
        onProviderUpdated={onProviderUpdated}
        aprobadoPorCliente={aprobadoPorCliente}
      />
    </li>
  );
}
