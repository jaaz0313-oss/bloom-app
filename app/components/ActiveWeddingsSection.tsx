"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Wedding } from "@/app/data/weddings";
import { WeddingCard } from "./WeddingCard";

export type SearchableWedding = Wedding & {
  brideName: string | null;
  groomName: string | null;
};

type ActiveWeddingsSectionProps = {
  weddings: SearchableWedding[];
  newWeddingButton?: React.ReactNode;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function weddingMatchesQuery(
  wedding: SearchableWedding,
  query: string,
): boolean {
  if (!query) return true;

  const haystack = [
    wedding.brideName ?? "",
    wedding.groomName ?? "",
    wedding.city,
    wedding.couple,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(query);
}

export function ActiveWeddingsSection({
  weddings,
  newWeddingButton,
}: ActiveWeddingsSectionProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = normalizeSearchText(query);

  const filteredWeddings = useMemo(
    () =>
      weddings.filter((wedding) =>
        weddingMatchesQuery(wedding, normalizedQuery),
      ),
    [weddings, normalizedQuery],
  );

  const countLabel = normalizedQuery
    ? `${filteredWeddings.length} de ${weddings.length}`
    : String(weddings.length);

  return (
    <>
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-bloom-ink">
            Bodas activas
          </h1>
          <p className="mt-1 text-bloom-muted">
            {countLabel}{" "}
            {weddings.length === 1 ? "boda" : "bodas"} en curso
          </p>
        </div>

        {newWeddingButton}
      </div>

      <div className="relative mt-6">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-bloom-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por novia, novio o ciudad…"
          aria-label="Buscar bodas activas"
          className="w-full rounded-xl border border-bloom-border bg-bloom-surface py-2.5 pl-10 pr-4 text-sm text-bloom-ink outline-none ring-0 placeholder:text-bloom-muted focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30"
        />
      </div>

      {filteredWeddings.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-10 text-center text-sm text-bloom-muted">
          {normalizedQuery
            ? "No se encontraron bodas con ese criterio"
            : "No hay bodas activas."}
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {filteredWeddings.map((wedding) => (
            <li key={wedding.id}>
              <WeddingCard wedding={wedding} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
