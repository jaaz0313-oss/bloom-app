"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOwnTelefonoAction } from "@/app/actions/profile";

type UserPhoneEditorProps = {
  initialTelefono: string | null;
};

export function UserPhoneEditor({ initialTelefono }: UserPhoneEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [telefono, setTelefono] = useState(initialTelefono ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayValue = initialTelefono?.trim() || null;

  useEffect(() => {
    if (!editing) {
      setTelefono(initialTelefono ?? "");
    }
  }, [initialTelefono, editing]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("telefono", telefono.trim());
      await updateOwnTelefonoAction(formData);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs text-bloom-muted">
        <span>
          {displayValue ? (
            <>
              Tel.{" "}
              <span className="font-medium text-bloom-ink">{displayValue}</span>
            </>
          ) : (
            "Sin teléfono"
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setTelefono(initialTelefono ?? "");
            setError(null);
            setEditing(true);
          }}
          className="font-medium text-bloom-accent hover:text-bloom-accent-hover"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="mt-2 space-y-2 rounded-xl border border-bloom-border bg-bloom-canvas/80 p-2.5 text-left"
    >
      <label className="block text-xs font-medium text-bloom-ink">
        Tu teléfono
      </label>
      <input
        type="tel"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        className="w-full min-w-[10rem] rounded-lg border border-bloom-border bg-bloom-surface px-2.5 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/20"
        placeholder="Ej: 3001234567"
        disabled={saving}
        autoFocus
      />
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setTelefono(initialTelefono ?? "");
            setError(null);
          }}
          disabled={saving}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-bloom-muted hover:text-bloom-ink disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-bloom-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-bloom-accent-hover disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
