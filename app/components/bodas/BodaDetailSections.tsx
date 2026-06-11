"use client";

import { AddProviderModalButton } from "@/app/components/bodas/AddProviderModalButton";
import { BriefBoda } from "@/app/components/bodas/BriefBoda";
import {
  BodaAccordionSection,
  BodaCollapsiblePanel,
} from "@/app/components/bodas/BodaAccordionSection";
import { ClientInfoSection } from "@/app/components/bodas/ClientInfoSection";
import { ContratoSection } from "@/app/components/bodas/ContratoSection";
import { NotasInternas } from "@/app/components/bodas/NotasInternas";
import { PaymentProjection } from "@/app/components/bodas/PaymentProjection";
import { ProviderList } from "@/app/components/bodas/ProviderList";
import { CronogramaContratacion } from "@/app/components/CronogramaContratacion";
import { CitasSection } from "@/app/components/citas/CitasSection";
import type { CitaRow } from "@/app/data/citas";
import type { BriefBodaRow } from "@/app/data/brief-boda";
import type { ContratoRow } from "@/app/data/contratos";
import type { NotaBodaRow } from "@/app/data/notas-boda";
import {
  groupNotasReunionByProveedor,
  type NotaReunionRow,
} from "@/app/data/notas-reunion";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import {
  computePaymentProjection,
  type ProveedorRow,
} from "@/app/data/providers";
import type { BodaRow } from "@/app/data/weddings";
import { hasPermission, type UserRole } from "@/lib/auth/roles";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import type { CitaLookupBoda, CitaLookupEquipo, CitaLookupLead } from "@/app/components/citas/CitaFormModal";
import { BODA_SECTION_PROVEEDORES } from "@/lib/boda-url";
import { filterCitasFuturas } from "@/lib/citas";

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
};

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
}: BodaDetailSectionsProps) {
  const projection = computePaymentProjection(providers, pagosByProveedor);
  const notasReunionByProveedor = groupNotasReunionByProveedor(notasReunion);
  const hasPaymentContent =
    projection.totalContratado > 0 ||
    projection.totalPagado > 0 ||
    providers.length > 0;

  return (
    <div className="mt-8 space-y-4">
      <BodaAccordionSection
        title="Información de los clientes"
        defaultOpen={false}
        hasContent={
          hasClientInfo || (canViewContrato && hasContrato)
        }
      >
        <ClientInfoSection
          embedded
          bodaId={bodaId}
          boda={boda}
          role={role}
          plannerName={plannerName}
          providers={providers}
          pagosByProveedor={pagosByProveedor}
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
        hasContent={notas.length > 0}
      >
        <NotasInternas
          embedded
          bodaId={bodaId}
          bodaNombre={boda.nombre_pareja}
          initialNotas={notas}
          equipo={equipo}
          currentUserId={currentUserId}
          currentUserNombre={plannerName}
          role={role}
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
        />
      </BodaAccordionSection>

      <BodaAccordionSection
        title="Proveedores"
        sectionKey={BODA_SECTION_PROVEEDORES}
        openSection={openSection}
        defaultOpen
        hasContent={providers.length > 0}
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-bloom-muted">
              {providers.length}{" "}
              {providers.length === 1 ? "proveedor" : "proveedores"} registrados
            </p>
            {hasPermission(role, "providers.manage") && (
              <AddProviderModalButton
                bodaId={bodaId}
                bodaNombre={boda.nombre_pareja}
                role={role}
              />
            )}
          </div>
          <ProviderList
            providers={providers}
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
            pagosByProveedor={pagosByProveedor}
            notasReunionByProveedor={notasReunionByProveedor}
            role={role}
            whatsappGrupoLink={boda.whatsapp_grupo_link}
            highlightProveedorId={highlightProveedorId}
          />
        </div>
      </BodaAccordionSection>

      <BodaAccordionSection
        title="Cronograma de contratación"
        defaultOpen={false}
        hasContent={hasCronograma}
      >
        <CronogramaContratacion
          embedded
          bodaId={bodaId}
          fechaBoda={boda.fecha_boda}
          canManage={hasPermission(role, "cronograma.manage")}
        />
      </BodaAccordionSection>
    </div>
  );
}
