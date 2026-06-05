"use client";

import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { ClienteBodaEstadoResumen } from "@/lib/cliente-boda-estado";
import {
  formatClienteDiasParaBoda,
  getClienteMensajeMotivacional,
} from "@/lib/cliente-i18n";

type ClienteBodaEstadoProps = {
  estado: ClienteBodaEstadoResumen;
};

export function ClienteBodaEstado({ estado }: ClienteBodaEstadoProps) {
  const { locale, t } = useClienteLocale();
  const mensajeMotivacional = getClienteMensajeMotivacional(
    estado.diasParaBoda,
    locale,
  );
  const dias = formatClienteDiasParaBoda(estado.diasParaBoda, locale);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-bloom-border bg-gradient-to-br from-bloom-surface via-bloom-canvas to-[#f3ebe3] p-6 shadow-sm sm:p-8">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-bloom-accent/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-bloom-success/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bloom-accent/15 text-bloom-accent ring-1 ring-bloom-accent/20"
          aria-hidden
        >
          <FlorIcon />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
            {t.estadoBodaTitle}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-bloom-ink/90 sm:text-lg">
            {mensajeMotivacional}
          </p>
        </div>
      </div>

      <dl className="relative mt-8 grid gap-4 sm:grid-cols-3">
        <DiasStatCard dias={dias} diasParaBoda={estado.diasParaBoda} />
        <StatCard
          label={t.providersReady}
          value={`${estado.porcentajeProveedores}%`}
          sublabel={t.providersReadySub(
            estado.proveedoresContratados,
            estado.totalCategorias,
          )}
          accent="warm"
        />
        <StatCard
          label={t.paymentsCompleted}
          value={`${estado.porcentajePagos}%`}
          sublabel={t.paymentsCompletedSub}
          accent="success"
        />
      </dl>
    </section>
  );
}

function DiasStatCard({
  dias,
  diasParaBoda,
}: {
  dias: ReturnType<typeof formatClienteDiasParaBoda>;
  diasParaBoda: number;
}) {
  const { t } = useClienteLocale();

  if (diasParaBoda > 0) {
    return (
      <StatCard
        label={t.countdown}
        value={String(dias.display)}
        sublabel={dias.label}
        accent="accent"
      />
    );
  }

  return (
    <StatCard
      label={t.countdown}
      value={dias.todayLabel}
      sublabel={dias.label}
      accent="accent"
    />
  );
}

function StatCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel?: string;
  accent: "accent" | "warm" | "success";
}) {
  const valueColor =
    accent === "success"
      ? "text-bloom-success"
      : accent === "warm"
        ? "text-bloom-accent"
        : "text-bloom-ink";

  return (
    <div className="rounded-xl border border-bloom-border/70 bg-white/70 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
        {label}
      </dt>
      <dd className={`mt-2 font-display text-3xl sm:text-4xl ${valueColor}`}>
        {value}
      </dd>
      {sublabel && (
        <dd className="mt-1 text-sm text-bloom-muted">{sublabel}</dd>
      )}
    </div>
  );
}

function FlorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M12 2.5c.6 1.8 1.8 3 3.6 3.6-1.8.6-3 1.8-3.6 3.6-.6-1.8-1.8-3-3.6-3.6 1.8-.6 3-1.8 3.6-3.6Zm0 11.2c.5 1.5 1.5 2.5 3 3-.5 1.5-1.5 2.5-3 3-.5-1.5-1.5-2.5-3-3 1.5-.5 2.5-1.5 3-3Zm-5.8-2.2c1 .8 1.6 1.8 1.8 3-.8 1-1.8 1.6-3 1.8-1-.8-1.6-1.8-1.8-3 .8-1 1.8-1.6 3-1.8Zm11.6 0c1 .8 1.6 1.8 1.8 3-.8 1-1.8 1.6-3 1.8-1-.8-1.6-1.8-1.8-3 .8-1 1.8-1.6 3-1.8Z" />
    </svg>
  );
}
