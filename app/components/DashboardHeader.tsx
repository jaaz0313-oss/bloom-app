"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PLANNER_SETTINGS,
  loadPlannerSettings,
  savePlannerSettings,
  type PlannerSettings,
} from "@/lib/planner-settings";

export function DashboardHeader() {
  const [settings, setSettings] = useState<PlannerSettings>(
    DEFAULT_PLANNER_SETTINGS,
  );
  const [draft, setDraft] = useState<PlannerSettings>(DEFAULT_PLANNER_SETTINGS);
  const [editing, setEditing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = loadPlannerSettings();
    setSettings(stored);
    setDraft(stored);
    setMounted(true);
  }, []);

  function openEdit() {
    setDraft(settings);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(settings);
    setEditing(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const next: PlannerSettings = {
      roleLabel: draft.roleLabel.trim() || DEFAULT_PLANNER_SETTINGS.roleLabel,
      name: draft.name.trim() || DEFAULT_PLANNER_SETTINGS.name,
    };

    savePlannerSettings(next);
    setSettings(next);
    setDraft(next);
    setEditing(false);
  }

  const display = mounted ? settings : DEFAULT_PLANNER_SETTINGS;

  return (
    <header className="border-b border-bloom-border bg-bloom-surface/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bloom-accent text-lg font-semibold text-white shadow-sm"
              aria-hidden
            >
              B
            </div>
            <div>
              <p className="font-display text-2xl tracking-wide text-bloom-ink">
                Bloom
              </p>
              <p className="text-sm text-bloom-muted">Gestión de bodas</p>
            </div>
          </div>

          <div className="min-w-0 text-right">
            {editing ? (
              <form
                onSubmit={handleSave}
                className="ml-auto w-full max-w-xs space-y-2 rounded-xl border border-bloom-border bg-bloom-canvas p-3 text-left"
              >
                <div className="space-y-1">
                  <label
                    htmlFor="planner-role"
                    className="text-xs font-medium text-bloom-muted"
                  >
                    Rol / título
                  </label>
                  <input
                    id="planner-role"
                    type="text"
                    value={draft.roleLabel}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, roleLabel: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Organizadora de bodas"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="planner-name"
                    className="text-xs font-medium text-bloom-muted"
                  >
                    Nombre
                  </label>
                  <input
                    id="planner-name"
                    type="text"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((s) => ({ ...s, name: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="María González"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-bloom-muted transition-colors hover:bg-bloom-border hover:text-bloom-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-bloom-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bloom-accent-hover"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={openEdit}
                className="group rounded-lg px-2 py-1 text-right transition-colors hover:bg-bloom-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
                title="Editar perfil"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted group-hover:text-bloom-ink">
                  {display.roleLabel}
                </p>
                <p className="font-medium text-bloom-ink">{display.name}</p>
                <p className="mt-0.5 text-xs text-bloom-muted opacity-0 transition-opacity group-hover:opacity-100">
                  Clic para editar
                </p>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

const inputClass =
  "w-full rounded-lg border border-bloom-border bg-bloom-surface px-2.5 py-1.5 text-sm text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";
