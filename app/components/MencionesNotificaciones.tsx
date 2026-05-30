"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MencionNotaConDetalle } from "@/app/data/menciones-notas";
import { formatDateTimeStable } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type MencionesNotificacionesProps = {
  userId: string;
};

export function MencionesNotificaciones({ userId }: MencionesNotificacionesProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menciones, setMenciones] = useState<MencionNotaConDetalle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenciones = useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("menciones_notas")
      .select(
        "id, nota_id, usuario_id, visto, created_at, notas_boda(contenido, boda_id, bodas(nombre_pareja))",
      )
      .eq("usuario_id", userId)
      .eq("visto", false)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      setMenciones(normalizeMenciones(data));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchMenciones();
  }, [fetchMenciones]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function marcarVista(mencionId: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("menciones_notas")
      .update({ visto: true })
      .eq("id", mencionId);

    if (!error) {
      setMenciones((prev) => prev.filter((m) => m.id !== mencionId));
      router.refresh();
    }
  }

  async function marcarTodasVistas() {
    if (!supabase || menciones.length === 0) return;

    const ids = menciones.map((m) => m.id);
    const { error } = await supabase
      .from("menciones_notas")
      .update({ visto: true })
      .in("id", ids);

    if (!error) {
      setMenciones([]);
      router.refresh();
    }
  }

  const count = menciones.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchMenciones();
        }}
        className="relative rounded-full border border-bloom-border p-2 text-bloom-ink transition-colors hover:bg-bloom-canvas"
        aria-label={
          count > 0
            ? `${count} menciones sin leer`
            : "Notificaciones de menciones"
        }
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bloom-accent px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Cerrar notificaciones"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-bloom-border bg-bloom-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-bloom-border px-4 py-3">
              <p className="text-sm font-medium text-bloom-ink">Menciones</p>
              {count > 0 && (
                <button
                  type="button"
                  onClick={marcarTodasVistas}
                  className="text-xs font-medium text-bloom-accent hover:text-bloom-accent-hover"
                >
                  Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-bloom-muted">
                  Cargando…
                </p>
              ) : menciones.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-bloom-muted">
                  No tienes menciones nuevas
                </p>
              ) : (
                <ul className="divide-y divide-bloom-border">
                  {menciones.map((m) => {
                    const bodaId = m.notas_boda?.boda_id;
                    const bodaNombre =
                      m.notas_boda?.bodas?.nombre_pareja ?? "Boda";
                    const contenido = m.notas_boda?.contenido ?? "";

                    return (
                      <li key={m.id}>
                        <Link
                          href={bodaId ? `/bodas/${bodaId}` : "#"}
                          onClick={() => marcarVista(m.id)}
                          className="block px-4 py-3 transition-colors hover:bg-bloom-canvas/80"
                        >
                          <p className="text-xs font-medium text-bloom-accent">
                            {bodaNombre}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-bloom-ink">
                            {contenido}
                          </p>
                          <p className="mt-1 text-xs text-bloom-muted">
                            {formatDateTimeStable(m.created_at)}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function normalizeMenciones(raw: unknown[]): MencionNotaConDetalle[] {
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const notaRaw = r.notas_boda;
    const nota = Array.isArray(notaRaw) ? notaRaw[0] : notaRaw;
    const notaObj = nota as Record<string, unknown> | undefined;
    const bodasRaw = notaObj?.bodas;
    const bodas = Array.isArray(bodasRaw) ? bodasRaw[0] : bodasRaw;

    return {
      id: String(r.id),
      nota_id: String(r.nota_id),
      usuario_id: String(r.usuario_id),
      visto: Boolean(r.visto),
      created_at: String(r.created_at),
      notas_boda: notaObj
        ? {
            contenido: String(notaObj.contenido ?? ""),
            boda_id: String(notaObj.boda_id ?? ""),
            bodas: bodas
              ? {
                  nombre_pareja: String(
                    (bodas as { nombre_pareja?: string }).nombre_pareja ?? "",
                  ),
                }
              : null,
          }
        : null,
    };
  });
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.79 2.608a1 1 0 0 1 1.42 0l.394.394A5.97 5.97 0 0 1 11 3.75c3.314 0 6 2.463 6 5.5v2.066l1.106 2.21a1 1 0 0 1-.884 1.45H3.778a1 1 0 0 1-.884-1.45L4 11.316V9.25c0-3.037 2.686-5.5 6-5.5 1.12 0 2.17.305 3.07.842l.72-.984ZM8 16.5a2 2 0 1 0 4 0H8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
