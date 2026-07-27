"use client";

import { useId, useMemo, useState } from "react";
import { useClienteLocale } from "@/app/components/cliente/ClienteLocaleProvider";
import type { TastingRow } from "@/app/data/tastings";
import {
  getClienteTastingsDayLabel,
} from "@/lib/cliente-i18n";
import { formatCurrency, formatShortDateStable } from "@/lib/format";
import {
  formatClienteTastingTimeRange,
  groupClienteTastingsByDay,
} from "@/lib/cliente-tastings";
import {
  buildGoogleMapsUrl,
  getTastingDisplayTitle,
  getTastingTipoBadgeClass,
  normalizeTastingTipoCita,
} from "@/lib/tastings";

type ClienteTastingsSectionProps = {
  tastings: TastingRow[];
};

export function ClienteTastingsSection({ tastings }: ClienteTastingsSectionProps) {
  const [open, setOpen] = useState(true);
  const panelId = useId();
  const { locale, t } = useClienteLocale();

  const dias = useMemo(
    () => groupClienteTastingsByDay(tastings),
    [tastings],
  );

  if (tastings.length === 0) {
    return null;
  }

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
              {t.tastingsTitle}
            </span>
          </span>
          <AccordionChevron open={open} />
        </span>
        <span className="block w-full text-sm font-medium text-bloom-muted">
          {t.tastingsSubtitle(tastings.length, dias.length)}
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
          <div className="space-y-8 border-t border-bloom-border/80 px-5 py-6 sm:px-8 sm:py-8">
            {dias.map((dia) => (
              <div key={dia.fecha}>
                <h3 className="font-display text-xl text-bloom-accent">
                  {getClienteTastingsDayLabel(dia.fecha, locale)}
                </h3>
                <p className="mt-0.5 text-sm text-bloom-muted">
                  {formatShortDateStable(dia.fecha)}
                </p>

                <ol className="relative mt-5 space-y-0 border-l border-bloom-accent/20 pl-6">
                  {dia.tastings.map((tasting, index) => (
                    <li key={tasting.id} className="relative pb-6 last:pb-0">
                      <span
                        className="absolute -left-[1.84rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-bloom-accent bg-bloom-surface"
                        aria-hidden
                      />
                      <div className="rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-4 sm:px-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-lg text-bloom-ink">
                                {getTastingDisplayTitle(tasting, {
                                  noProviderLabel: t.tastingsNoProvider,
                                })}
                              </p>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTastingTipoBadgeClass(tasting.tipo_cita)}`}
                              >
                                {
                                  t.tastingsTipoLabels[
                                    normalizeTastingTipoCita(tasting.tipo_cita)
                                  ]
                                }
                              </span>
                            </div>
                            {tasting.categoria && (
                              <p className="mt-0.5 text-sm text-bloom-muted">
                                {tasting.categoria}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-sm font-medium text-bloom-accent">
                            {formatClienteTastingTimeRange(
                              tasting.hora_inicio,
                              tasting.hora_fin,
                            )}
                          </p>
                        </div>

                        {!tasting.prueba_pagada &&
                          (tasting.costo ?? 0) > 0 && (
                          <p className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">
                            {t.tastingsPaymentReminder}
                          </p>
                        )}

                        {tasting.direccion?.trim() && (
                          <p className="mt-3 text-sm">
                            <a
                              href={buildGoogleMapsUrl(tasting.direccion)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 font-medium text-bloom-ink underline decoration-bloom-accent/40 underline-offset-2 transition-colors hover:text-bloom-accent"
                            >
                              <MapPinIcon />
                              {tasting.direccion}
                            </a>
                          </p>
                        )}

                        {((tasting.costo != null && tasting.costo > 0) ||
                          tasting.notas?.trim()) && (
                          <dl className="mt-3 space-y-2 border-t border-bloom-border/60 pt-3 text-sm">
                            {tasting.costo != null && tasting.costo > 0 && (
                              <div>
                                <dt className="text-bloom-muted">
                                  {t.tastingsCost}
                                </dt>
                                <dd className="font-medium text-bloom-ink">
                                  {formatCurrency(tasting.costo)}
                                </dd>
                              </div>
                            )}
                            {tasting.notas?.trim() && (
                              <div>
                                <dt className="text-bloom-muted">
                                  {t.tastingsNotes}
                                </dt>
                                <dd className="whitespace-pre-wrap text-bloom-ink">
                                  {tasting.notas.trim()}
                                </dd>
                              </div>
                            )}
                          </dl>
                        )}

                        {index < dia.tastings.length - 1 && (
                          <span className="sr-only">{t.tastingsNextItem}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
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

function MapPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0 text-bloom-accent"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.4-.213.654-.369.509-.316 1.2-.832 1.955-1.579C14.185 14.901 15 13.099 15 11a5 5 0 0 0-10 0c0 2.099.815 3.901 2.345 5.357a10.314 10.314 0 0 0 1.955 1.579 6.888 6.888 0 0 0 .654.369 5.741 5.741 0 0 0 .281.14l.018.008.006.003ZM10 8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
