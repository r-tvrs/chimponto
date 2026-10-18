import { supabase } from "@/lib/supabase";
import type { Punch, Punches } from "./punches";

// A RLS já limita às batidas do usuário da sessão.
const livePunches = () =>
  supabase
    .from("punches")
    .select("id, punched_at, source, note, updated_at")
    .is("deleted_at", null);

type PunchRow = {
  id: string;
  punched_at: string;
  source: string;
  note: string | null;
  updated_at: string;
};

function punchOfRow(row: PunchRow): Punch {
  return {
    id: row.id,
    punchedAt: new Date(row.punched_at),
    // O check da tabela garante 'manual' | 'ocr'.
    source: row.source as Punch["source"],
    note: row.note,
    updatedAt: new Date(row.updated_at),
  };
}

export const supabasePunches: Punches = {
  async onDate(date) {
    const { data, error } = await livePunches().eq("local_date", date);
    if (error) throw error;
    return data.map(punchOfRow);
  },

  async between(start, end) {
    const { data, error } = await livePunches().gte("local_date", start).lte("local_date", end);
    if (error) throw error;
    return data.map(punchOfRow);
  },

  async upsert(write) {
    const { data, error, status } = await supabase.rpc("upsert_punch", {
      id: write.id,
      punched_at: write.punchedAt.toISOString(),
      source: write.source,
      // Os tipos gerados não marcam argumentos de RPC como anuláveis; o SQL aceita null.
      note: write.note as string,
      updated_at: write.updatedAt.toISOString(),
      // null explícito: sem a chave, o PostgREST não acha a função.
      deleted_at: (write.deletedAt?.toISOString() ?? null) as string,
    });
    if (!error) return data;
    // 0 é falha de rede; 401 (sessão expirada), 408, 429 e 5xx passam sozinhos. O resto (ex.:
    // 42501 da RLS, 400 de argumento inválido) o servidor recusaria de novo.
    return status === 0 || [401, 408, 429].includes(status) || status >= 500
      ? "failed"
      : "rejected";
  },
};
