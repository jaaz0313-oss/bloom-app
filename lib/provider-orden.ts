import { supabase } from "@/lib/supabase";

export async function persistProviderOrden(
  providers: { id: string }[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!supabase) {
    return { ok: false, message: "Supabase no está configurado." };
  }

  const results = await Promise.all(
    providers.map((provider, index) =>
      supabase
        .from("proveedores")
        .update({ orden: index })
        .eq("id", provider.id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { ok: false, message: failed.error.message };
  }

  return { ok: true };
}
