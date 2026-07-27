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

/**
 * Suscribe a cambios de Postgres vía Supabase Realtime.
 * Si falla la suscripción, no lanza: la app sigue con el flujo normal.
 * Devuelve cleanup para desmontar (removeChannel).
 */
export function subscribeRealtimeTables(
  channelName: string,
  subscriptions: Array<RealtimeTableSubscription<Record<string, unknown>>>,
): () => void {
  if (!supabase || subscriptions.length === 0) {
    return () => {};
  }

  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      channel = channel.on(
        "postgres_changes",
        {
          event: sub.event ?? "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          try {
            sub.onPayload(
              payload as RealtimePostgresChangesPayload<Record<string, unknown>>,
            );
          } catch (error) {
            console.error(`[realtime:${sub.table}] handler`, error);
          }
        },
      );
    }

    channel.subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`[realtime:${channelName}]`, status, err);
      }
    });
  } catch (error) {
    console.error(`[realtime:${channelName}] subscribe failed`, error);
    return () => {};
  }

  return () => {
    if (!channel || !supabase) return;
    try {
      void supabase.removeChannel(channel);
    } catch (error) {
      console.error(`[realtime:${channelName}] cleanup`, error);
    }
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
