"use client";

import { useEffect, useMemo, useState } from "react";
import type { CitaRow } from "@/app/data/citas";
import { CITA_TIPO_DOT_STYLES, CITA_TIPO_LABELS } from "@/app/data/citas";
import {
  normalizeCitaFecha,
  normalizeCitaRow,
  sortCitasBySchedule,
} from "@/lib/citas";
import {
  addDays,
  addMonthsAnchor,
  getMonthAnchor,
  getMonthLabel,
  getTodayIso,
  getWeekDays,
  parseIsoDate,
  type CalendarView,
} from "@/lib/citas-calendar";
import { formatShortDateStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import { CalendarioMensual } from "./CalendarioMensual";
import { CalendarioSemana } from "./CalendarioSemana";
import { CalendarioDiaOverflowModal } from "./CalendarioDiaOverflowModal";
import { CitaCalendarioDetalleModal } from "./CitaCalendarioDetalleModal";
import { TastingCalendarioDetalleModal } from "./TastingCalendarioDetalleModal";
import {
  CitaFormModal,
  type CitaLookupBoda,
  type CitaLookupEquipo,
  type CitaLookupLead,
} from "./CitaFormModal";
import { CitaConAcciones } from "./CitaConAcciones";
import { TastingCalendarioItem } from "./TastingCalendarioItem";
import {
  buildCalendarioEventosByDate,
  getCalendarioEventoId,
  type CalendarioEvento,
  type TastingCalendarioRow,
} from "@/lib/calendario-eventos";
import {
  TASTING_TIPO_CITA_DOT,
  TASTING_TIPO_CITA_LABELS,
  TASTING_TIPO_CITA_OPTIONS,
} from "@/lib/tastings";

type CalendarioClientProps = {
  citas: CitaRow[];
  tastings: TastingCalendarioRow[];
  bodas: CitaLookupBoda[];
  leads: CitaLookupLead[];
  equipo: CitaLookupEquipo[];
  role: UserRole;
  currentUserId: string;
  currentUserNombre: string;
};

export function CalendarioClient({
  citas: initialCitas,
  tastings,
  bodas,
  leads,
  equipo,
  role,
  currentUserId,
  currentUserNombre,
}: CalendarioClientProps) {
  const [citas, setCitas] = useState(() => initialCitas.map(normalizeCitaRow));

  useEffect(() => {
    setCitas((prev) => {
      const merged = new Map<string, CitaRow>();
      for (const c of initialCitas.map(normalizeCitaRow)) {
        merged.set(c.id, c);
      }
      for (const c of prev) {
        if (!merged.has(c.id)) {
          merged.set(c.id, normalizeCitaRow(c));
        }
      }
      return sortCitasBySchedule(Array.from(merged.values()));
    });
  }, [initialCitas]);

  const [view, setView] = useState<CalendarView>("mes");
  const [anchorDate, setAnchorDate] = useState(() => getTodayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCita, setSelectedCita] = useState<CitaRow | null>(null);
  const [selectedTasting, setSelectedTasting] =
    useState<TastingCalendarioRow | null>(null);
  const [overflowDay, setOverflowDay] = useState<{
    fecha: string;
    eventos: CalendarioEvento[];
  } | null>(null);

  const eventosByDate = useMemo(
    () => buildCalendarioEventosByDate(citas, tastings),
    [citas, tastings],
  );

  const monthAnchorIso = getMonthAnchor(anchorDate);
  const monthAnchor = parseIsoDate(monthAnchorIso);
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const weekDays = getWeekDays(anchorDate);
  const todayIso = getTodayIso();

  function goToToday() {
    setAnchorDate(todayIso);
  }

  function navigate(delta: number) {
    if (view === "mes") {
      setAnchorDate(addMonthsAnchor(anchorDate, delta));
    } else if (view === "semana") {
      setAnchorDate(addDays(anchorDate, delta * 7));
    } else {
      setAnchorDate(addDays(anchorDate, delta));
    }
  }

  const headerLabel =
    view === "mes"
      ? getMonthLabel(year, month)
      : view === "semana"
        ? `${formatShortDateStable(weekDays[0])} – ${formatShortDateStable(weekDays[6])}`
        : formatShortDateStable(anchorDate);

  const dayEventos = eventosByDate.get(normalizeCitaFecha(anchorDate)) ?? [];

  function handleEventoClick(evento: CalendarioEvento) {
    if (evento.kind === "cita") {
      setSelectedTasting(null);
      setSelectedCita(evento.cita);
      return;
    }
    setSelectedCita(null);
    setSelectedTasting(evento.tasting);
  }

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
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-bloom-border bg-bloom-surface p-1">
          {(["mes", "semana", "dia"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-bloom-accent text-white"
                  : "text-bloom-ink hover:bg-bloom-canvas"
              }`}
            >
              {v === "mes" ? "Mes" : v === "semana" ? "Semana" : "Día"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-bloom-accent-hover"
        >
          Nueva cita
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-bloom-border bg-bloom-surface px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full border border-bloom-border px-3 py-1.5 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-display text-lg text-bloom-ink">{headerLabel}</p>
          <button
            type="button"
            onClick={goToToday}
            className="mt-0.5 text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover"
          >
            Hoy
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded-full border border-bloom-border px-3 py-1.5 text-sm font-medium text-bloom-ink hover:bg-bloom-canvas"
        >
          →
        </button>
      </div>

      {view === "mes" && (
        <CalendarioMensual
          year={year}
          month={month}
          eventosByDate={eventosByDate}
          onDayClick={(fechaKey) => {
            setAnchorDate(fechaKey);
            setView("dia");
          }}
          onEventoClick={handleEventoClick}
          onVerMasClick={(fechaKey, dayEventos) =>
            setOverflowDay({ fecha: fechaKey, eventos: dayEventos })
          }
        />
      )}

      {view === "semana" && (
        <CalendarioSemana
          weekDays={weekDays}
          eventosByDate={eventosByDate}
          onDayClick={(fechaKey) => {
            setAnchorDate(fechaKey);
            setView("dia");
          }}
          onEventoClick={handleEventoClick}
          onVerMasClick={(fechaKey, dayEventos) =>
            setOverflowDay({ fecha: fechaKey, eventos: dayEventos })
          }
        />
      )}

      {view === "dia" && (
        <div className="space-y-3">
          {dayEventos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-bloom-border px-6 py-10 text-center text-sm text-bloom-muted">
              No hay eventos este día.
            </p>
          ) : (
            dayEventos.map((evento) =>
              evento.kind === "cita" ? (
                <CitaConAcciones
                  key={evento.cita.id}
                  cita={evento.cita}
                  bodas={bodas}
                  leads={leads}
                  equipo={equipo}
                  role={role}
                  currentUserId={currentUserId}
                  currentUserNombre={currentUserNombre}
                  onChange={(next) => handleCitaChange(evento.cita.id, next)}
                />
              ) : (
                <TastingCalendarioItem
                  key={evento.tasting.id}
                  tasting={evento.tasting}
                />
              ),
            )
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-bloom-muted">
        {(
          Object.entries(CITA_TIPO_LABELS) as [keyof typeof CITA_TIPO_LABELS, string][]
        ).map(([tipo, label]) => (
          <span key={tipo} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${CITA_TIPO_DOT_STYLES[tipo as keyof typeof CITA_TIPO_DOT_STYLES]}`}
            />
            {label}
          </span>
        ))}
        {tastings.length > 0 &&
          TASTING_TIPO_CITA_OPTIONS.map((option) => (
            <span key={option.value} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${TASTING_TIPO_CITA_DOT[option.value]}`}
              />
              {TASTING_TIPO_CITA_LABELS[option.value]}
            </span>
          ))}
      </div>

      <CitaFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(cita) => {
          const normalized = normalizeCitaRow(cita);
          setCitas((prev) => sortCitasBySchedule([...prev, normalized]));
          const fecha = normalizeCitaFecha(normalized.fecha);
          setAnchorDate(fecha);
          setView("mes");
        }}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        defaultFecha={anchorDate}
      />

      <CitaCalendarioDetalleModal
        cita={selectedCita}
        onClose={() => setSelectedCita(null)}
        bodas={bodas}
        leads={leads}
        equipo={equipo}
        role={role}
        currentUserId={currentUserId}
        currentUserNombre={currentUserNombre}
        onChange={(next) => {
          if (selectedCita) {
            handleCitaChange(selectedCita.id, next);
          }
        }}
      />

      <TastingCalendarioDetalleModal
        tasting={selectedTasting}
        onClose={() => setSelectedTasting(null)}
      />

      <CalendarioDiaOverflowModal
        fecha={overflowDay?.fecha ?? null}
        eventos={overflowDay?.eventos ?? []}
        onClose={() => setOverflowDay(null)}
        onSelectEvento={(evento) => {
          setOverflowDay(null);
          handleEventoClick(evento);
        }}
      />
    </div>
  );
}
