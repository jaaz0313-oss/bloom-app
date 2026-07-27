import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type RealtimeTableSubscription<T extends Record<string, unknown>> = {
  table: string;
  event?: RealtimeEvent;
  /** Ej: `boda_id=eq.<uuid>` */
  filter?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void;
};

const CONNECT_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 3_000;
const MAX_ATTEMPTS = 2; // intento inicial + 1 reintento

/** Id estable por carga de la app (pestaña) para nombres de canal únicos. */
let realtimeSessionId: string | null = null;

function getRealtimeSessionId(): string {
  if (realtimeSessionId) return realtimeSessionId;
  realtimeSessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return realtimeSessionId;
}

function buildChannelName(
  baseName: string,
  instanceId: string,
  attempt: number,
): string {
  return `${baseName}:${getRealtimeSessionId()}:${instanceId}:a${attempt}`;
}

/**
 * Suscribe a cambios de Postgres vía Supabase Realtime.
 *
 * Resiliencia:
 * - Timeout de 10s si no llega a SUBSCRIBED
 * - Un reintento a los 3s si falla; luego abandona en silencio
 * - Cleanup con `removeChannel`
 * - Si Realtime no está disponible, la app sigue sin errores visibles
 */
export function subscribeRealtimeTables(
  channelName: string,
  subscriptions: Array<RealtimeTableSubscription<Record<string, unknown>>>,
): () => void {
  if (!supabase || subscriptions.length === 0) {
    return () => {};
  }

  const instanceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `i-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  let disposed = false;
  let failing = false;
  let channel: RealtimeChannel | null = null;
  let attempt = 0;
  let subscribed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (retryTimer != null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (connectTimer != null) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
  }

  async function removeCurrentChannel(): Promise<void> {
    if (!channel || !supabase) {
      channel = null;
      return;
    }
    const current = channel;
    channel = null;
    try {
      await supabase.removeChannel(current);
    } catch {
      // Silencioso: Realtime puede no estar disponible.
    }
  }

  function scheduleRetryOrAbandon() {
    if (disposed) return;
    if (attempt + 1 >= MAX_ATTEMPTS) {
      // Segundo fallo: abandonar sin logs.
      return;
    }
    attempt += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!disposed) {
        attach();
      }
    }, RETRY_DELAY_MS);
  }

  function handleFailure() {
    if (disposed || failing) return;
    failing = true;
    subscribed = false;
    clearTimers();
    void removeCurrentChannel().finally(() => {
      failing = false;
      if (disposed) return;
      scheduleRetryOrAbandon();
    });
  }

  function startConnectTimeout() {
    if (connectTimer != null) clearTimeout(connectTimer);
    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (disposed || subscribed) return;
      handleFailure();
    }, CONNECT_TIMEOUT_MS);
  }

  function attach() {
    if (disposed || !supabase) return;

    const uniqueName = buildChannelName(channelName, instanceId, attempt);
    subscribed = false;

    try {
      let nextChannel = supabase.channel(uniqueName);

      for (const sub of subscriptions) {
        nextChannel = nextChannel.on(
          "postgres_changes",
          {
            event: sub.event ?? "*",
            schema: "public",
            table: sub.table,
            ...(sub.filter ? { filter: sub.filter } : {}),
          },
          (payload) => {
            if (disposed) return;
            try {
              sub.onPayload(
                payload as RealtimePostgresChangesPayload<
                  Record<string, unknown>
                >,
              );
            } catch {
              // Silencioso: no romper la UI por un handler fallido.
            }
          },
        );
      }

      channel = nextChannel;
      startConnectTimeout();

      nextChannel.subscribe((status) => {
        if (disposed) return;

        if (status === "SUBSCRIBED") {
          subscribed = true;
          clearTimers();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          handleFailure();
        }
        // CLOSED durante removeChannel se ignora vía disposed/failing.
      });
    } catch {
      handleFailure();
    }
  }

  attach();

  return () => {
    disposed = true;
    clearTimers();
    void removeCurrentChannel();
  };
}

/** Upsert por id en un array (INSERT/UPDATE). */
export function upsertById<T extends { id: string }>(
  list: T[],
  row: T,
): T[] {
  const index = list.findIndex((item) => item.id === row.id);
  if (index === -1) return [...list, row];
  const next = [...list];
  next[index] = row;
  return next;
}

/** Elimina por id. */
export function removeById<T extends { id: string }>(
  list: T[],
  id: string,
): T[] {
  return list.filter((item) => item.id !== id);
}
