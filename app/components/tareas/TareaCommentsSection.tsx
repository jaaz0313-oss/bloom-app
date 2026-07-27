"use client";

import { useCallback, useEffect, useState } from "react";
import type { TareaComentarioRow } from "@/app/data/tareas";
import {
  subscribeRealtimeTables,
  upsertById,
} from "@/lib/supabase-realtime";
import { supabase } from "@/lib/supabase";

type TareaCommentsSectionProps = {
  tareaId: string;
  currentUsername: string;
  nombreByUsername: Map<string, string>;
};

function formatComentarioFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TareaCommentsSection({
  tareaId,
  currentUsername,
  nombreByUsername,
}: TareaCommentsSectionProps) {
  const [comentarios, setComentarios] = useState<TareaComentarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [contenido, setContenido] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComentarios = useCallback(async () => {
    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("tareas_comentarios")
      .select("*")
      .eq("tarea_id", tareaId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setComentarios([]);
    } else {
      setError(null);
      setComentarios((data ?? []) as TareaComentarioRow[]);
    }
    setLoading(false);
  }, [tareaId]);

  useEffect(() => {
    setLoading(true);
    void loadComentarios();
  }, [loadComentarios]);

  useEffect(() => {
    return subscribeRealtimeTables(`tareas:comentarios:${tareaId}`, [
      {
        table: "tareas_comentarios",
        event: "INSERT",
        filter: `tarea_id=eq.${tareaId}`,
        onPayload: (payload) => {
          const row = payload.new as TareaComentarioRow;
          if (!row?.id || row.tarea_id !== tareaId) return;
          setComentarios((prev) =>
            [...upsertById(prev, row)].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            ),
          );
        },
      },
    ]);
  }, [tareaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const texto = contenido.trim();
    if (!texto) {
      setError("Escribe un comentario.");
      return;
    }
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("tareas_comentarios")
        .insert({
          tarea_id: tareaId,
          autor: currentUsername,
          contenido: texto,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setContenido("");
      setComentarios((current) => [
        ...current,
        data as TareaComentarioRow,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 border-t border-bloom-border pt-4">
      <h4 className="text-sm font-medium text-bloom-ink">Comentarios</h4>

      {loading ? (
        <p className="mt-2 text-sm text-bloom-muted">Cargando comentarios…</p>
      ) : comentarios.length === 0 ? (
        <p className="mt-2 text-sm text-bloom-muted">
          Aún no hay comentarios.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {comentarios.map((comentario) => {
            const autorNombre =
              nombreByUsername.get(comentario.autor) ?? comentario.autor;

            return (
              <li
                key={comentario.id}
                className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-medium text-bloom-ink">
                    {autorNombre}
                  </p>
                  <p className="text-xs text-bloom-muted">
                    {formatComentarioFecha(comentario.created_at)}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                  {comentario.contenido}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          rows={2}
          placeholder="Escribe un comentario…"
          disabled={submitting}
          className="w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30 disabled:opacity-60"
        />
        {error && (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !contenido.trim()}
            className="rounded-full bg-bloom-accent px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Comentar"}
          </button>
        </div>
      </form>
    </div>
  );
}
