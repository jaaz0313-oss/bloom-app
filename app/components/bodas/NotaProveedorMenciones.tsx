"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";
import {
  crearTareasPorMencionesEnNotaProveedor,
  mensajeTareasAsignadas,
} from "@/lib/proveedor-nota-tareas";
import { supabase } from "@/lib/supabase";

export type ProcesarNotaMencionInput = {
  proveedorId: string;
  categoria: string;
  nombreProveedor: string;
  nota: string;
};

type PendingRetry = {
  input: ProcesarNotaMencionInput;
  message: string;
};

type NotaProveedorMencionContextValue = {
  equipo: EquipoUsuarioMencion[];
  procesar: (input: ProcesarNotaMencionInput) => Promise<void>;
};

const NotaProveedorMencionContext =
  createContext<NotaProveedorMencionContextValue | null>(null);

export function NotaProveedorMencionProvider({
  equipo,
  bodaId,
  autorUserId,
  children,
}: {
  equipo: EquipoUsuarioMencion[];
  bodaId: string;
  autorUserId: string;
  children: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRetry | null>(null);
  const [retrying, setRetrying] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const retryingRef = useRef(false);

  const notify = useCallback((nombres: string[]) => {
    const text = mensajeTareasAsignadas(nombres);
    if (!text) return;
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const procesar = useCallback(
    async (input: ProcesarNotaMencionInput) => {
      const nota = input.nota.trim();
      const payload: ProcesarNotaMencionInput = { ...input, nota };
      if (!nota) {
        setPending((current) =>
          current?.input.proveedorId === input.proveedorId ? null : current,
        );
        return;
      }
      if (!supabase) {
        setPending({
          input: payload,
          message:
            "La nota se guardó, pero Supabase no está configurado para crear la tarea.",
        });
        return;
      }

      const autorUsername =
        equipo.find((user) => user.id === autorUserId)?.username ?? "";

      retryingRef.current = true;
      setRetrying(true);
      try {
        const result = await crearTareasPorMencionesEnNotaProveedor(supabase, {
          proveedorId: payload.proveedorId,
          bodaId,
          categoria: payload.categoria,
          nombreProveedor: payload.nombreProveedor,
          nota,
          equipo,
          autorUsername,
        });

        if (result.created.length > 0) {
          notify(result.created.map((item) => item.nombre));
        }

        if (result.failures.length === 0) {
          setPending((current) =>
            current && current.input.proveedorId !== payload.proveedorId
              ? current
              : null,
          );
          return;
        }

        setPending({
          input: payload,
          message: `La nota se guardó. ${result.failures
            .map(
              (failure) =>
                `No se pudo crear la tarea para ${failure.nombre}: ${failure.message}`,
            )
            .join(" ")}`,
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "error desconocido";
        setPending({
          input: payload,
          message: `La nota se guardó. No se pudo crear la tarea: ${detail}`,
        });
      } finally {
        retryingRef.current = false;
        setRetrying(false);
      }
    },
    [autorUserId, bodaId, equipo, notify],
  );

  function reintentar() {
    if (!pending || retryingRef.current) return;
    void procesar(pending.input);
  }

  return (
    <NotaProveedorMencionContext.Provider value={{ equipo, procesar }}>
      {children}
      <NotaMencionAvisos
        toast={toast}
        pending={pending}
        retrying={retrying}
        onRetry={reintentar}
      />
    </NotaProveedorMencionContext.Provider>
  );
}

export function useNotaProveedorMenciones(): NotaProveedorMencionContextValue {
  const value = useContext(NotaProveedorMencionContext);
  if (!value) {
    throw new Error(
      "useNotaProveedorMenciones debe usarse dentro de NotaProveedorMencionProvider",
    );
  }
  return value;
}

function NotaMencionAvisos({
  toast,
  pending,
  retrying,
  onRetry,
}: {
  toast: string | null;
  pending: PendingRetry | null;
  retrying: boolean;
  onRetry: () => void;
}) {
  if (!toast && !pending) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 z-[90] flex w-[min(100%-2rem,28rem)] -translate-x-1/2 flex-col gap-2">
      {toast ? (
        <p
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg"
          role="status"
        >
          {toast}
        </p>
      ) : null}
      {pending ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg"
          role="alert"
        >
          <p>{pending.message}</p>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-2 rounded-full bg-red-700 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-800 disabled:opacity-60"
          >
            {retrying ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
