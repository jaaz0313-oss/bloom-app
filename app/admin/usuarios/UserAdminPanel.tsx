"use client";

import { useState } from "react";
import type { UserRole } from "@/lib/auth/roles";

type UserItem = {
  id: string;
  username: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  rol: UserRole;
  activo: boolean;
  googleConnected: boolean;
};

type UserAdminPanelProps = {
  users: UserItem[];
  currentUserId: string;
  createUserAction: (formData: FormData) => Promise<void>;
  updateUserAction: (formData: FormData) => Promise<void>;
  setUserActiveAction: (formData: FormData) => Promise<void>;
};

const roles: UserRole[] = ["admin", "lider", "coordinadora", "finanzas"];

export function UserAdminPanel({
  users,
  currentUserId,
  createUserAction,
  updateUserAction,
  setUserActiveAction,
}: UserAdminPanelProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
        <h2 className="font-display text-xl text-bloom-ink">Crear usuario</h2>
        <form
          action={async (formData) => {
            setError(null);
            try {
              await createUserAction(formData);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error inesperado.");
            }
          }}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <input name="username" className={inputClass} placeholder="username" required />
          <input name="nombre" className={inputClass} placeholder="Nombre completo" required />
          <input
            name="telefono"
            type="tel"
            className={inputClass}
            placeholder="Teléfono (opcional)"
          />
          <input
            name="email"
            type="email"
            className={inputClass}
            placeholder="Email (opcional)"
          />
          <select name="rol" className={inputClass} defaultValue="lider" required>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            name="password"
            type="password"
            className={inputClass}
            placeholder="Contraseña inicial (mínimo 8)"
            required
          />
          <button className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white">
            Crear usuario
          </button>
        </form>
      </section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
        <h2 className="font-display text-xl text-bloom-ink">Usuarios existentes</h2>
        <ul className="mt-4 space-y-4">
          {users.map((user) => (
            <li key={user.id} className="rounded-xl border border-bloom-border p-4">
              <p className="text-sm text-bloom-muted">@{user.username}</p>
              <form
                action={async (formData) => {
                  setError(null);
                  try {
                    await updateUserAction(formData);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Error actualizando usuario.",
                    );
                  }
                }}
                className="mt-2 grid gap-2 sm:grid-cols-2"
              >
                <input type="hidden" name="id" value={user.id} />
                <input
                  name="nombre"
                  defaultValue={user.nombre}
                  className={inputClass}
                  required
                />
                <input
                  name="telefono"
                  type="tel"
                  defaultValue={user.telefono ?? ""}
                  className={inputClass}
                  placeholder="Teléfono"
                />
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ""}
                  className={inputClass}
                  placeholder="Email"
                />
                <select name="rol" defaultValue={user.rol} className={inputClass}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  name="password"
                  type="password"
                  className={inputClass}
                  placeholder="Nueva contraseña (opcional)"
                />
                <button className="rounded-full border border-bloom-border px-4 py-2 text-sm font-medium text-bloom-ink">
                  Guardar cambios
                </button>
              </form>

              <form
                action={setUserActiveAction}
                className="mt-3"
              >
                <input type="hidden" name="id" value={user.id} />
                <input type="hidden" name="active" value={String(!user.activo)} />
                <button
                  className={`rounded-full px-4 py-1.5 text-xs font-medium ${user.activo ? "border border-red-200 bg-red-50 text-red-700" : "border border-green-200 bg-green-50 text-green-700"}`}
                >
                  {user.activo ? "Desactivar" : "Activar"}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {user.googleConnected ? (
                  <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    Google conectado
                  </span>
                ) : user.id === currentUserId ? (
                  <a
                    href="/api/auth/google?next=%2Fadmin%2Fusuarios"
                    className="inline-flex items-center justify-center rounded-full border border-bloom-border bg-bloom-surface px-4 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
                  >
                    Conectar Google
                  </a>
                ) : (
                  <span className="rounded-full border border-bloom-border bg-bloom-canvas px-3 py-1 text-xs font-medium text-bloom-muted">
                    Sin conectar
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";
