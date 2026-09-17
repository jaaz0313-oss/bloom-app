"use client";

import Link from "next/link";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import { WeddingsByYearGroups } from "@/app/components/WeddingsByYearGroups";
import type { Wedding } from "@/app/data/weddings";
import { formatWeddingDate } from "@/lib/format";

const YEAR_OPEN_STORAGE_KEY = "bloom:finished-weddings-year-open";

type FinishedWeddingsSectionProps = {
  weddings: Wedding[];
};

export function FinishedWeddingsSection({
  weddings,
}: FinishedWeddingsSectionProps) {
  if (weddings.length === 0) return null;

  return (
    <DashboardAccordionSection
      title="Bodas finalizadas"
      count={weddings.length}
      subtitle="Bodas ya realizadas, con acceso completo al detalle"
      defaultOpen={false}
    >
      <WeddingsByYearGroups
        weddings={weddings}
        storageKey={YEAR_OPEN_STORAGE_KEY}
        listClassName="space-y-3"
        renderItem={(wedding) => (
          <div className="flex flex-col gap-3 rounded-xl border border-bloom-border bg-bloom-canvas/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-bloom-ink">{wedding.couple}</p>
              <p className="mt-1 text-sm text-bloom-muted">
                {formatWeddingDate(wedding.date)} · {wedding.city}
              </p>
            </div>
            <Link
              href={`/bodas/${wedding.id}`}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-2 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
            >
              Ver boda
            </Link>
          </div>
        )}
      />
    </DashboardAccordionSection>
  );
}
