"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export type WeddingWithDate = {
  id: string;
  date: string;
};

function getWeddingYear(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function defaultYearOpen(year: number): boolean {
  return year >= getCurrentYear();
}

function readStoredYearOpenState(
  storageKey: string,
): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function storeYearOpenState(
  storageKey: string,
  state: Record<string, boolean>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function groupWeddingsByYear<T extends WeddingWithDate>(
  weddings: T[],
): Array<{ year: number; weddings: T[] }> {
  const byYear = new Map<number, T[]>();
  for (const wedding of weddings) {
    const year = getWeddingYear(wedding.date);
    const list = byYear.get(year);
    if (list) list.push(wedding);
    else byYear.set(year, [wedding]);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, items]) => ({
      year,
      weddings: [...items].sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

type WeddingsByYearGroupsProps<T extends WeddingWithDate> = {
  weddings: T[];
  storageKey: string;
  /** Años que deben mostrarse abiertos (p. ej. resultados de búsqueda). */
  forceOpenYears?: ReadonlySet<number>;
  renderItem: (wedding: T) => React.ReactNode;
  listClassName?: string;
  emptyMessage?: React.ReactNode;
};

export function WeddingsByYearGroups<T extends WeddingWithDate>({
  weddings,
  storageKey,
  forceOpenYears,
  renderItem,
  listClassName = "space-y-4",
  emptyMessage,
}: WeddingsByYearGroupsProps<T>) {
  const groups = useMemo(() => groupWeddingsByYear(weddings), [weddings]);
  const [storedOpen, setStoredOpen] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStoredOpen(readStoredYearOpenState(storageKey));
    setHydrated(true);
  }, [storageKey]);

  function isYearOpen(year: number): boolean {
    if (forceOpenYears?.has(year)) return true;
    const key = String(year);
    if (hydrated && key in storedOpen) return storedOpen[key];
    return defaultYearOpen(year);
  }

  function toggleYear(year: number) {
    const key = String(year);
    const nextOpen = !isYearOpen(year);
    setStoredOpen((prev) => {
      const next = { ...prev, [key]: nextOpen };
      storeYearOpenState(storageKey, next);
      return next;
    });
  }

  if (groups.length === 0) {
    return emptyMessage ?? null;
  }

  return (
    <div className="space-y-6">
      {groups.map(({ year, weddings: yearWeddings }) => {
        const open = isYearOpen(year);
        const panelId = `weddings-year-${storageKey}-${year}`;

        return (
          <section key={year} className="space-y-3">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleYear(year)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-bloom-canvas/70"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-bloom-muted transition-transform duration-200 ${
                  open ? "rotate-0" : "-rotate-90"
                }`}
                aria-hidden
              />
              <span className="font-display text-xl text-bloom-ink tabular-nums">
                {year}
              </span>
              <span className="rounded-full bg-bloom-canvas px-2 py-0.5 text-xs font-medium tabular-nums text-bloom-muted">
                {yearWeddings.length}
              </span>
              <span className="h-px flex-1 bg-bloom-border/80" aria-hidden />
            </button>

            <div
              id={panelId}
              role="region"
              aria-label={`Bodas ${year}`}
              className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <ul className={listClassName}>
                  {yearWeddings.map((wedding) => (
                    <li key={wedding.id}>{renderItem(wedding)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
