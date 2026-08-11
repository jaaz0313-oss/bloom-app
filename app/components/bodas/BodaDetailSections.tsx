"use client";

import { useEffect, useRef, useState } from "react";
import { AddProviderModalButton } from "@/app/components/bodas/AddProviderModalButton";
import { BriefBoda } from "@/app/components/bodas/BriefBoda";
import {
  BodaAccordionSection,
  BodaCollapsiblePanel,
} from "@/app/components/bodas/BodaAccordionSection";
import { ClientInfoSection } from "@/app/components/bodas/ClientInfoSection";
import { ContratoSection } from "@/app/components/bodas/ContratoSection";
import { DetallesCelebracionSection } from "@/app/components/bodas/DetallesCelebracionSection";
import { NotasInternas } from "@/app/components/bodas/NotasInternas";
import { PaymentProjection } from "@/app/components/bodas/PaymentProjection";
import { PresupuestoEstimadoSection } from "@/app/components/bodas/PresupuestoEstimadoSection";
import { ProveedoresSugeridosSection } from "@/app/components/bodas/ProveedoresSugeridosSection";
import { TastingsSection } from "@/app/components/bodas/TastingsSection";
import { ProviderList } from "@/app/components/bodas/ProviderList";
import { CronogramaContratacion } from "@/app/components/CronogramaContratacion";
import { CitasSection } from "@/app/components/citas/CitasSection";
import type { CitaRow } from "@/app/data/citas";
import type { BriefBodaRow } from "@/app/data/brief-boda";
import type { ContratoRow } from "@/app/data/contratos";
import type { CronogramaItemRow } from "@/app/data/cronograma";
import {
  hasDetallesCelebracionContent,
  type DetallesCelebracionRow,
} from "@/app/data/detalles-celebracion";
import type { NotaBodaRow } from "@/app/data/notas-boda";
import {
  groupNotasReunionByProveedor,
  type NotaReunionRow,
} from "@/app/data/notas-reunion";
import type { PagoRow } from "@/app/data/pagos";
import type { PresupuestoEstimadoCategoriaRow } from "@/app/data/presupuesto-estimado";
import type { ProveedorSugeridoWithSelection } from "@/app/data/proveedores-sugeridos";
import {
  computePaymentProjection,
  listDepositosReembolsables,
  type ProveedorRow,
} from "@/app/data/providers";
import type { TastingRow } from "@/app/data/tastings";
import type { BodaRow } from "@/app/data/weddings";
import {
  canManageBodaEstado,
  canManageClientePortalFlags,
  hasPermission,
  type UserRole,
} from "@/lib/auth/roles";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import type {
  CitaLookupBoda,
  CitaLookupEquipo,
  CitaLookupLead,
} from "@/app/components/citas/CitaFormModal";
import { BODA_SECTION_PROVEEDORES, BODA_SECTION_TASTINGS } from "@/lib/boda-url";
import { filterCitasFuturas } from "@/lib/citas";
import { canManageProveedoresSugeridos } from "@/lib/proveedores-sugeridos";
import {
  removeById,
  subscribeRealtimeTables,
  upsertById,
} from "@/lib/supabase-realtime";
import { canViewTastings } from "@/lib/tastings";

type BodaDetailSectionsProps = {
  bodaId: string;
  boda: BodaRow;
  role: UserRole;
  plannerName: string;
  currentUserId: string;
  providers: ProveedorRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
  notas: NotaBodaRow[];
  notasReunion: NotaReunionRow[];
  tastings: TastingRow[];
  proveedoresSugeridos: ProveedorSugeridoWithSelection[];
  detallesCelebracion: DetallesCelebracionRow | null;
  brief: BriefBodaRow | null;
  contrato: ContratoRow | null;
  citas: CitaRow[];
  bodasLookup: CitaLookupBoda[];
  leadsLookup: CitaLookupLead[];
  equipo: EquipoUsuarioMencion[];
  equipoCitas: CitaLookupEquipo[];
  canViewBrief: boolean;
  canViewContrato: boolean;
  hasCronograma: boolean;
  hasClientInfo: boolean;
  hasBrief: boolean;
  hasContrato: boolean;
  openSection?: string | null;
  highlightProveedorId?: string | null;
  canManageDrive?: boolean;
  driveFolderUrl?: string | null;
  cronogramaItems?: CronogramaItemRow[];
  presupuestoEstimados?: PresupuestoEstimadoCategoriaRow[];
  aprobadoPorClienteIds?: string[];
};

function sortProveedores(list: ProveedorRow[]): ProveedorRow[] {
  return [...list].sort((a, b) => {
    const ordenA = a.orden ?? Number.MAX_SAFE_INTEGER;
    const ordenB = b.orden ?? Number.MAX_SAFE_INTEGER;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.created_at.localeCompare(b.created_at);
  });
}

function sortNotas(list: NotaBodaRow[]): NotaBodaRow[] {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function sortPagos(list: PagoRow[]): PagoRow[] {
  return [...list].sort((a, b) => {
    const byFecha = b.fecha_pago.localeCompare(a.fecha_pago);
    if (byFecha !== 0) return byFecha;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });
}

function applyPagoRealtime(
  current: Record<string, PagoRow[]>,
  eventType: string,
  nextRow: PagoRow | null,
  prevRow: Partial<PagoRow> | null,
): Record<string, PagoRow[]> {
  const result: Record<string, PagoRow[]> = { ...current };

  if (eventType === "DELETE") {
    const id = prevRow?.id;
    if (!id) return current;
    if (prevRow.proveedor_id) {
      result[prevRow.proveedor_id] = removeById(
        result[prevRow.proveedor_id] ?? [],
        id,
      );
      return result;
    }
    for (const key of Object.keys(result)) {
      result[key] = removeById(result[key] ?? [], id);
    }
    return result;
  }

  if ((eventType === "INSERT" || eventType === "UPDATE") && nextRow) {
    if (
      eventType === "UPDATE" &&
      prevRow?.proveedor_id &&
      prevRow.proveedor_id !== nextRow.proveedor_id
    ) {
      result[prevRow.proveedor_id] = removeById(
        result[prevRow.proveedor_id] ?? [],
        nextRow.id,
      );
    }
    result[nextRow.proveedor_id] = sortPagos(
      upsertById(result[nextRow.proveedor_id] ?? [], nextRow),
    );
  }

  return result;
}

export function BodaDetailSections({
  bodaId,
  boda,
  role,
  plannerName,
  currentUserId,
  providers,
  pagosByProveedor,
  notas,
  notasReunion,
  tastings,
  proveedoresSugeridos,
  detallesCelebracion,
  brief,
  contrato,
  citas,
  bodasLookup,
  leadsLookup,
  equipo,
  equipoCitas,
  canViewBrief,
  canViewContrato,
  hasCronograma,
  hasClientInfo,
  hasBrief,
  hasContrato,
  openSection = null,
  highlightProveedorId = null,
  canManageDrive = false,
  driveFolderUrl = null,
  cronogramaItems = [],
  presupuestoEstimados = [],
  aprobadoPorClienteIds = [],
}: BodaDetailSectionsProps) {
  const [liveProviders, setLiveProviders] = useState(providers);
  const [livePagosByProveedor, setLivePagosByProveedor] =
    useState(pagosByProveedor);
  const [liveNotas, setLiveNotas] = useState(notas);
  const [liveHasCronograma, setLiveHasCronograma] = useState(hasCronograma);

  const providerIdsRef = useRef(new Set(providers.map((p) => p.id)));

  useEffect(() => {
    setLiveProviders(providers);
    providerIdsRef.current = new Set(providers.map((p) => p.id));
  }, [providers]);

  useEffect(() => {
    setLivePagosByProveedor(pagosByProveedor);
  }, [pagosByProveedor]);

  useEffect(() => {
    setLiveNotas(notas);
  }, [notas]);

  useEffect(() => {
    setLiveHasCronograma(hasCronograma);
  }, [hasCronograma]);

  useEffect(() => {
    return subscribeRealtimeTables(`boda:${bodaId}:detail`, [
      {
        table: "proveedores",
        filter: `boda_id=eq.${bodaId}`,
        onPayload: (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<ProveedorRow>;
            if (!oldRow.id) return;
            setLiveProviders((prev) => {
              const next = removeById(prev, oldRow.id!);
              providerIdsRef.current = new Set(next.map((p) => p.id));
              return next;
            });
            setLivePagosByProveedor((prev) => {
              if (!oldRow.id || !(oldRow.id in prev)) return prev;
              const next = { ...prev };
              delete next[oldRow.id];
              return next;
            });
            return;
          }

          const row = payload.new as ProveedorRow;
          if (!row?.id || row.boda_id !== bodaId) return;

          setLiveProviders((prev) => {
            // Merge con la fila existente: payloads realtime incompletos
            // no deben borrar campos como valor_total.
            const existing = prev.find((item) => item.id === row.id);
            const patch = Object.fromEntries(
              Object.entries(row).filter(([, value]) => value !== undefined),
            ) as Partial<ProveedorRow>;
            const merged = {
              ...(existing ?? ({} as ProveedorRow)),
              ...patch,
              id: row.id,
            } as ProveedorRow;
            console.log("[BodaDetail] realtime proveedores upsert", {
              id: merged.id,
              valor_total: merged.valor_total,
              patchKeys: Object.keys(patch),
            });
            const next = sortProveedores(upsertById(prev, merged));
            providerIdsRef.current = new Set(next.map((p) => p.id));
            return next;
          });
        },
      },
      {
        table: "pagos",
        onPayload: (payload) => {
          const nextRow =
            payload.eventType === "DELETE" ? null : (payload.new as PagoRow);
          const prevRow =
            payload.eventType === "INSERT"
              ? null
              : ((payload.old as Partial<PagoRow> | null) ?? null);

          if (payload.eventType === "DELETE") {
            const id = prevRow?.id;
            if (!id) return;
            // Sin proveedor_id (replica identity default) buscamos en todos los buckets.
            if (
              prevRow?.proveedor_id &&
              !providerIdsRef.current.has(prevRow.proveedor_id)
            ) {
              return;
            }
            setLivePagosByProveedor((current) =>
              applyPagoRealtime(current, "DELETE", null, prevRow),
            );
            return;
          }

          const proveedorId = nextRow?.proveedor_id ?? null;
          if (!proveedorId || !providerIdsRef.current.has(proveedorId)) {
            return;
          }

          setLivePagosByProveedor((current) =>
            applyPagoRealtime(
              current,
              payload.eventType,
              nextRow,
              prevRow,
            ),
          );
        },
      },
      {
        table: "notas_boda",
        filter: `boda_id=eq.${bodaId}`,
        onPayload: (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<NotaBodaRow>;
            if (!oldRow.id) return;
            setLiveNotas((prev) => removeById(prev, oldRow.id!));
            return;
          }

          const row = payload.new as NotaBodaRow;
          if (!row?.id || row.boda_id !== bodaId) return;
          setLiveNotas((prev) => sortNotas(upsertById(prev, row)));
        },
      },
      {
        table: "cronograma_items",
        filter: `boda_id=eq.${bodaId}`,
        onPayload: (payload) => {
          if (payload.eventType === "INSERT") {
            setLiveHasCronograma(true);
          }
        },
      },
    ]);
  }, [bodaId]);

  const projection = computePaymentProjection(
    liveProviders,
    livePagosByProveedor,
  );
  const depositos = listDepositosReembolsables(liveProviders);
  const notasReunionByProveedor = groupNotasReunionByProveedor(notasReunion);
  const hasPaymentContent =
    projection.totalContratado > 0 ||
    projection.totalPagado > 0 ||
    depositos.length > 0 ||
    liveProviders.length > 0;
  const canManageSugeridos = canManageProveedoresSugeridos(role);
  const canManagePresupuesto = canManageClientePortalFlags(role);

  return (
    <div className="mt-8 space-y-4">
      <BodaAccordionSection
        title="Información de los clientes"
        defaultOpen={false}
        hasContent={hasClientInfo || (canViewContrato && hasContrato)}
      >
        <ClientInfoSection
          embedded
          bodaId={bodaId}
          boda={boda}
          role={role}
          plannerName={plannerName}
          providers={liveProviders}
          pagosByProveedor={livePagosByProveedor}
          canManageDrive={canManageDrive}
          driveFolderUrl={driveFolderUrl}
          contratoFirmante={contrato?.firmante ?? "novia"}
        />

        {canViewContrato && (
          <BodaCollapsiblePanel
            variant="nested"
            title="Contrato"
            defaultOpen={false}
            hasContent={hasContrato}
          >
            <p className="mb-5 text-sm text-bloom-muted">
              Honorarios, anticipo y generación del documento para firma.
            </p>
            <ContratoSection
              embedded
              bodaId={bodaId}
              boda={boda}
              initialContrato={contrato}
            />
          </BodaCollapsiblePanel>
        )}
      </BodaAccordionSection>

      <BodaAccordionSection
        title="Notas del equipo"
        defaultOpen={false}
        hasContent={liveNotas.length > 0}
      >
        <NotasInternas
          embedded
          bodaId={bodaId}
          bodaNombre={boda.nombre_pareja}
          initialNotas={liveNotas}
          equipo={equipo}
          currentUserId={currentUserId}
          currentUserNombre={plannerName}
          role={role}
        />
      </BodaAccordionSection>

      <BodaAccordionSection
        title="Citas"
        defaultOpen={false}
        hasContent={filterCitasFuturas(citas).length > 0}
      >
        <CitasSection
          embedded
          futureOnly
          initialCitas={citas}
          bodas={bodasLookup}
          leads={leadsLookup}
          equipo={equipoCitas}
          role={role}
          currentUserId={currentUserId}
          currentUserNombre={plannerName}
          defaultBodaId={bodaId}
        />
      </BodaAccordionSection>

      {canViewTastings(role) && (
        <BodaAccordionSection
          title="Semana de Tastings"
          sectionKey={BODA_SECTION_TASTINGS}
          openSection={openSection}
          defaultOpen={false}
          hasContent={tastings.length > 0}
        >
          <TastingsSection
            embedded
            bodaId={bodaId}
            bodaNombre={boda.nombre_pareja}
            initialTastings={tastings}
            equipo={equipo}
            role={role}
            currentUserId={currentUserId}
            currentUserNombre={plannerName}
          />
        </BodaAccordionSection>
      )}

      <BodaAccordionSection
        title="Detalles de la boda"
        defaultOpen={false}
        hasContent={hasDetallesCelebracionContent(detallesCelebracion)}
      >
        <DetallesCelebracionSection
          embedded
          detalles={detallesCelebracion}
          telefonoNovia={boda.telefono_novia}
          showClientePin={canManageBodaEstado(role)}
        />
      </BodaAccordionSection>

      {canViewBrief && (
        <BodaAccordionSection
          title="Brief de la boda"
          defaultOpen={false}
          hasContent={hasBrief}
        >
          <BriefBoda
            embedded
            bodaId={bodaId}
            bodaNombre={boda.nombre_pareja}
            initialBrief={brief}
          />
        </BodaAccordionSection>
      )}

      {canManageSugeridos && (
        <BodaAccordionSection
          title="Proveedores sugeridos"
          defaultOpen={false}
          hasContent={proveedoresSugeridos.length > 0}
        >
          <ProveedoresSugeridosSection
            embedded
            bodaId={bodaId}
            bodaNombre={boda.nombre_pareja}
            initialProveedores={proveedoresSugeridos}
            role={role}
            currentUserId={currentUserId}
          />
        </BodaAccordionSection>
      )}

      <BodaAccordionSection
        title="Cronograma de contratación"
        defaultOpen={false}
        hasContent={liveHasCronograma}
      >
        <CronogramaContratacion
          embedded
          bodaId={bodaId}
          fechaBoda={boda.fecha_boda}
          canManage={hasPermission(role, "cronograma.manage")}
          canActualizarPlantilla={canManageBodaEstado(role)}
          providers={liveProviders}
        />
      </BodaAccordionSection>

      <BodaAccordionSection
        title="Proveedores"
        sectionKey={BODA_SECTION_PROVEEDORES}
        openSection={openSection}
        defaultOpen
        hasContent={liveProviders.length > 0}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-bloom-muted">
              {liveProviders.length}{" "}
              {liveProviders.length === 1 ? "proveedor" : "proveedores"}{" "}
              registrados
            </p>
            {hasPermission(role, "providers.manage") && (
              <AddProviderModalButton
                bodaId={bodaId}
                bodaNombre={boda.nombre_pareja}
                role={role}
                currentUserId={currentUserId}
                currentUserNombre={plannerName}
                driveFolderUrl={driveFolderUrl}
              />
            )}
          </div>
          <ProviderList
            providers={liveProviders}
            bodaId={bodaId}
            boda={{
              nombrePareja: boda.nombre_pareja,
              fechaBoda: boda.fecha_boda,
              ciudad: boda.ciudad,
              whatsappGrupoLink: boda.whatsapp_grupo_link,
              telefonoNovia: boda.telefono_novia,
            }}
            plannerName={plannerName}
            currentUserId={currentUserId}
            pagosByProveedor={livePagosByProveedor}
            notasReunionByProveedor={notasReunionByProveedor}
            role={role}
            whatsappGrupoLink={boda.whatsapp_grupo_link}
            highlightProveedorId={highlightProveedorId}
            driveFolderUrl={driveFolderUrl}
            aprobadoPorClienteIds={aprobadoPorClienteIds}
            onProviderUpdated={(updated) => {
              console.log("[BodaDetail] onProviderUpdated", {
                id: updated.id,
                valor_total: updated.valor_total,
              });
              setLiveProviders((prev) => {
                const next = sortProveedores(upsertById(prev, updated));
                console.log(
                  "[BodaDetail] liveProviders valor_total after update",
                  next.find((item) => item.id === updated.id)?.valor_total,
                );
                return next;
              });
            }}
          />
        </div>
      </BodaAccordionSection>

      {canManagePresupuesto && (
        <BodaAccordionSection
          title="Presupuesto estimado"
          defaultOpen={false}
          hasContent={
            cronogramaItems.length > 0 || presupuestoEstimados.length > 0
          }
        >
          <PresupuestoEstimadoSection
            embedded
            bodaId={bodaId}
            providers={liveProviders}
            cronogramaItems={cronogramaItems}
            initialEstimados={presupuestoEstimados}
            mostrarAlCliente={Boolean(
              boda.mostrar_presupuesto_estimado_cliente,
            )}
          />
        </BodaAccordionSection>
      )}

      <BodaAccordionSection
        title="Proyección de pagos"
        defaultOpen
        hasContent={hasPaymentContent}
      >
        <PaymentProjection
          embedded
          totalContratado={projection.totalContratado}
          totalPagado={projection.totalPagado}
          saldoPendiente={projection.saldoPendiente}
          depositos={depositos}
        />
      </BodaAccordionSection>
    </div>
  );
}
