import { supabase } from "@/lib/supabase";
import type { Punch, Punches } from "./punches";

export const supabasePunches: Punches = {
  async onDate(date) {
    // A RLS já limita às batidas do usuário da sessão.
    const { data, error } = await supabase
      .from("punches")
      .select("id, punched_at, source, note, updated_at")
      .eq("local_date", date)
      .is("deleted_at", null);
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      punchedAt: new Date(row.punched_at),
      // O check da tabela garante 'manual' | 'ocr'.
      source: row.source as Punch["source"],
      note: row.note,
      updatedAt: new Date(row.updated_at),
    }));
  },

  async upsert(write) {
    const { data, error } = await supabase.rpc("upsert_punch", {
      id: write.id,
      punched_at: write.punchedAt.toISOString(),
      source: write.source,
      // Os tipos gerados não marcam argumentos de RPC como anuláveis; o SQL aceita null.
      note: write.note as string,
      updated_at: write.updatedAt.toISOString(),
      // null explícito: sem a chave, o PostgREST não acha a função.
      deleted_at: (write.deletedAt?.toISOString() ?? null) as string,
    });
    return error ? "failed" : data;
  },
};
