"use client";

import { useId, useState } from "react";
import type {
  ClienteCronogramaHito,
  ClienteCronogramaResumen,
} from "@/lib/cliente-cronograma";

type ClienteCronogramaProps = {
  resumen: ClienteCronogramaResumen;
};

export function ClienteCronograma({ resumen }: ClienteCronogramaProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (resumen.total === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
        <div className="px-5 py-8 text-center sm:px-8 sm:py-10">
          <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
            Tu cronograma
          </h2>
          <p className="mt-3 text-sm text-bloom-muted sm:text-base">
            Estamos preparando el cronograma de contratación de su boda. Muy
            pronto podrán ver aquí el avance de cada categoría.
          </p>
        </div>
      </section>
    );
  }

  const progressLabel = `${resumen.completados.length} de ${resumen.total} confirmados`;

  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[52px] w-full touch-manipulation flex-col gap-3 bg-gradient-to-br from-bloom-canvas to-[#f3ebe3] px-5 py-4 text-left transition-colors hover:from-bloom-canvas hover:to-[#efe6dc] active:bg-bloom-canvas/80 sm:px-8 sm:py-5"
      >
        <span className="flex w-full items-start justify-between gap-4">
          <span className="min-w-0 flex-1">
            <span className="font-display text-2xl text-bloom-ink sm:text-3xl">
              Tu cronograma
            </span>
          </span>
          <AccordionChevron open={open} />
        </span>

        <span className="block w-full">
          <span className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-bloom-muted">{progressLabel}</span>
            <span className="font-display text-lg text-bloom-accent tabular-nums">
              {resumen.porcentajeCompletado}%
            </span>
          </span>
          <span
            className="mt-2 block h-2 overflow-hidden rounded-full bg-bloom-border/80"
            role="progressbar"
            aria-valuenow={resumen.porcentajeCompletado}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressLabel}, ${resumen.porcentajeCompletado}% completado`}
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-bloom-success to-emerald-600 transition-all duration-500"
              style={{ width: `${resumen.porcentajeCompletado}%` }}
            />
          </span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-bloom-border/80 px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-sm leading-relaxed text-bloom-ink/90 sm:text-base">
              {resumen.mensajeAliento}
            </p>

            <div className="mt-6 space-y-8">
              {resumen.completados.length > 0 && (
                <HitoGroup
                  title="Completados"
                  icon="check"
                  tone="success"
                  hitos={resumen.completados}
                />
              )}
              {resumen.enProceso.length > 0 && (
                <HitoGroup
                  title="En proceso"
                  icon="progress"
                  tone="warm"
                  hitos={resumen.enProceso}
                />
              )}
              {resumen.pendientes.length > 0 && (
                <HitoGroup
                  title="Pendientes"
                  icon="pending"
                  tone="muted"
                  hitos={resumen.pendientes}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`mt-1 h-5 w-5 shrink-0 text-bloom-muted transition-transform duration-300 ${
        open ? "rotate-180" : "rotate-0"
      }`}
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

function HitoGroup({
  title,
  icon,
  tone,
  hitos,
}: {
  title: string;
  icon: "check" | "progress" | "pending";
  tone: "success" | "warm" | "muted";
  hitos: ClienteCronogramaHito[];
}) {
  const headerTone =
    tone === "success"
      ? "text-bloom-success"
      : tone === "warm"
        ? "text-bloom-accent"
        : "text-bloom-muted";

  return (
    <div>
      <div className={`flex items-center gap-2 ${headerTone}`}>
        <GroupIcon type={icon} />
        <h3 className="font-display text-lg text-bloom-ink sm:text-xl">
          {title}
        </h3>
        <span className="rounded-full bg-bloom-canvas px-2.5 py-0.5 text-xs font-medium text-bloom-muted">
          {hitos.length}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {hitos.map((hito) => (
          <li key={hito.id}>
            <HitoCard hito={hito} tone={tone} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HitoCard({
  hito,
  tone,
}: {
  hito: ClienteCronogramaHito;
  tone: "success" | "warm" | "muted";
}) {
  const borderClass =
    tone === "success"
      ? "border-green-200/80 bg-green-50/40"
      : tone === "warm"
        ? "border-amber-200/80 bg-amber-50/30"
        : "border-bloom-border bg-bloom-canvas/40";

  const badgeClass =
    tone === "success"
      ? "bg-green-100 text-green-800"
      : tone === "warm"
        ? "bg-amber-100 text-amber-900"
        : "bg-bloom-canvas text-bloom-muted";

  return (
    <article
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4 ${borderClass}`}
    >
      <StatusIcon estado={hito.estado} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-bloom-ink">{hito.categoria}</p>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            {hito.estadoLabel}
          </span>
        </div>
        {hito.proveedorNombre && (
          <p className="mt-1 text-sm text-bloom-muted">
            con{" "}
            <span className="font-medium text-bloom-ink">
              {hito.proveedorNombre}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}

function GroupIcon({ type }: { type: "check" | "progress" | "pending" }) {
  if (type === "check") {
    return (
      <span className="text-lg" aria-hidden>
        ✅
      </span>
    );
  }
  if (type === "progress") {
    return (
      <span className="text-lg" aria-hidden>
        🔄
      </span>
    );
  }
  return (
    <span className="text-lg" aria-hidden>
      ⏳
    </span>
  );
}

function StatusIcon({ estado }: { estado: ClienteCronogramaHito["estado"] }) {
  if (estado === "confirmado") {
    return (
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm text-green-700"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (estado === "en_proceso") {
    return (
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-800"
        aria-hidden
      >
        ···
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bloom-border/60 text-sm text-bloom-muted"
      aria-hidden
    >
      ○
    </span>
  );
}
