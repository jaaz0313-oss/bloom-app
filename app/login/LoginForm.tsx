"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toInternalEmail } from "@/lib/auth/internal-email";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) {
      setError("Ingresa usuario y contraseña.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: toInternalEmail(normalizedUsername),
        password,
      });

      if (signInError || !data.user) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("activo")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile?.activo) {
        await supabase.auth.signOut();
        setError("Tu usuario está inactivo. Contacta al administrador.");
        return;
      }

      router.replace(nextPath || "/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-bloom-ink">Usuario</label>
        <input
          autoComplete="username"
          className={inputClass}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="jaime"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="login-password"
          className="text-sm font-medium text-bloom-ink"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className={`${inputClass} pr-11`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-bloom-muted transition-colors hover:text-bloom-ink"
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
      >
        {submitting ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-bloom-border bg-bloom-canvas px-3 py-2 text-sm text-bloom-ink outline-none ring-0 focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30";
