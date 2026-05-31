"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotaBodaRow } from "@/app/data/notas-boda";
import { formatDateTimeStable } from "@/lib/format";
import type { UserRole } from "@/lib/auth/roles";
import {
  buildMencionNotaWhatsAppUrls,
  findMentionedUsers,
  openMencionNotaWhatsAppTabs,
  type EquipoUsuarioMencion,
} from "@/lib/notas-menciones";
import { supabase } from "@/lib/supabase";
import { MentionTextarea } from "./MentionTextarea";

type NotasInternasProps = {
  bodaId: string;
  bodaNombre: string;
  initialNotas: NotaBodaRow[];
  equipo: EquipoUsuarioMencion[];
  currentUserId: string;
  currentUserNombre: string;
  role: UserRole;
  embedded?: boolean;
};

const textareaClass =
  "w-full resize-y rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";

export function NotasInternas({
  bodaId,
  bodaNombre,
  initialNotas,
  equipo,
  currentUserId,
  currentUserNombre,
  role,
  embedded = false,
}: NotasInternasProps) {
  const router = useRouter();
  const [notas, setNotas] = useState(initialNotas);
  const [contenido, setContenido] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function canDeleteNota(nota: NotaBodaRow): boolean {
    if (role === "admin") return true;
    return nota.created_by === currentUserId;
  }

  async function procesarMenciones(notaId: string, texto: string) {
    const mencionados = findMentionedUsers(texto, equipo).filter(
      (u) => u.id !== currentUserId,
    );

    if (mencionados.length === 0) return;

    const rows = mencionados.map((u) => ({
      nota_id: notaId,
      usuario_id: u.id,
      visto: false,
    }));

    const { error: mencionesError } = await supabase!
      .from("menciones_notas")
      .insert(rows);

    if (mencionesError) {
      console.error("[menciones_notas]", mencionesError.message);
    }

    const urls = buildMencionNotaWhatsAppUrls(mencionados, {
      bodaNombre,
      contenidoNota: texto,
      autorNombre: currentUserNombre,
    });

    if (urls.length > 0) {
      openMencionNotaWhatsAppTabs(urls);
    }
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const texto = contenido.trim();
    if (!texto) {
      setError("Escribe el contenido de la nota.");
      return;
    }

    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from("notas_boda")
        .insert({
          boda_id: bodaId,
          contenido: texto,
          created_by: currentUserId,
          created_by_nombre: currentUserNombre.trim() || null,
        })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        const nota = data as NotaBodaRow;
        setNotas((current) => [nota, ...current]);
        await procesarMenciones(nota.id, texto);
      }
      setContenido("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEliminar(notaId: string) {
    if (!supabase) return;

    setError(null);
    setDeletingId(notaId);
    try {
      const { error: deleteError } = await supabase
        .from("notas_boda")
        .delete()
        .eq("id", notaId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setNotas((current) => current.filter((n) => n.id !== notaId));
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const shellClass = embedded
    ? ""
    : "rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm";
  const Shell = embedded ? "div" : "section";

  return (
    <Shell className={shellClass}>
      {!embedded && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl text-bloom-ink">Notas del equipo</h2>
            <span className="inline-flex rounded-full bg-bloom-canvas px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-bloom-muted">
              Solo visible para el equipo
            </span>
          </div>
          <p className="mt-1 text-sm text-bloom-muted">
            Notas internas para coordinación. Usa @ para mencionar a alguien del
            equipo.
          </p>
        </>
      )}
      {embedded && (
        <p className="mb-4 text-sm text-bloom-muted">
          Usa @ para mencionar a alguien del equipo.
        </p>
      )}

      <form className={`space-y-3 ${embedded ? "" : "mt-5"}`} onSubmit={handleAgregar}>
        <label htmlFor="nota-interna-contenido" className="sr-only">
          Nueva nota
        </label>
        <MentionTextarea
          id="nota-interna-contenido"
          value={contenido}
          onChange={setContenido}
          equipo={equipo}
          rows={3}
          className={textareaClass}
          placeholder="Escribe una nota… Usa @ para mencionar al equipo"
          disabled={submitting}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !contenido.trim()}
            className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
          >
            {submitting ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {notas.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/60 px-4 py-8 text-center text-sm text-bloom-muted">
          Aún no hay notas para esta boda.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notas.map((nota) => (
            <li
              key={nota.id}
              className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-bloom-ink">
                    {nota.contenido}
                  </p>
                  <p className="mt-2 text-xs text-bloom-muted">
                    {nota.created_by_nombre?.trim() || "Equipo"} ·{" "}
                    {formatDateTimeStable(nota.created_at)}
                  </p>
                </div>
                {canDeleteNota(nota) && (
                  <button
                    type="button"
                    onClick={() => handleEliminar(nota.id)}
                    disabled={deletingId === nota.id}
                    className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                  >
                    {deletingId === nota.id ? "Eliminando…" : "Eliminar"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
