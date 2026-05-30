"use client";

import { useEffect, useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import { normalizeCitaRow, sortCitasBySchedule } from "@/lib/citas";
import type { UserRole } from "@/lib/auth/roles";
import {
  CitaFormModal,
  type CitaLookupBoda,
  type CitaLookupEquipo,
  type CitaLookupLead,
} from "./CitaFormModal";
import { CitaConAcciones } from "./CitaConAcciones";

type CitasSectionProps = {
  initialCitas: CitaRow[];
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
  defaultBodaId?: string | null;
  defaultLeadId?: string | null;
};

export function CitasSection({
  initialCitas,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
  defaultBodaId = null,
  defaultLeadId = null,
}: CitasSectionProps) {
  const [citas, setCitas] = useState(() => initialCitas.map(normalizeCitaRow));
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setCitas(initialCitas.map(normalizeCitaRow));
  }, [initialCitas]);

  const sorted = sortCitasBySchedule(citas);

  function handleCitaChange(citaId: string, next: CitaRow | null) {
    setCitas((prev) => {
      if (!next) {
        return prev.filter((c) => c.id !== citaId);
      }
      return sortCitasBySchedule(
        prev.map((c) => (c.id === citaId ? normalizeCitaRow(next) : c)),
      );
    });
  }

  return (
    <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl text-bloom-ink">Citas</h2>
          <p className="mt-1 text-sm text-bloom-muted">
            Reuniones y compromisos relacionados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-canvas px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
        >
          Agendar cita
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted">
          No hay citas programadas.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {sorted.map((cita) => (
            <li key={cita.id}>
              <CitaConAcciones
                cita={cita}
                bodas={bodas}
                leads={leads}
                equipo={equipo}
                role={role}
                currentUserId={currentUserId}
                currentUserNombre={currentUserNombre}
                showDate
                onChange={(next) => handleCitaChange(cita.id, next)}
              />
            </li>
          ))}
        </ul>
      )}

      <CitaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(cita) =>
          setCitas((prev) =>
            sortCitasBySchedule([...prev, normalizeCitaRow(cita)]),
          )
        }
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        defaultBodaId={defaultBodaId}
        defaultLeadId={defaultLeadId}
      />
    </section>
  );
}
