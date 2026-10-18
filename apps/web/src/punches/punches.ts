import type { LocalDate } from "@chimponto/domain";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { useSignedInUser } from "@/auth/auth";

export type Punch = {
  id: string;
  punchedAt: Date;
  source: "manual" | "ocr";
  note: string | null;
  updatedAt: Date;
};

/** Criação, edição ou exclusão lógica (`deletedAt`), sempre com a batida inteira (LWW). */
export type PunchWrite = Punch & { deletedAt: Date | null };

/** Resposta do `upsert_punch`; `failed` é erro de rede ou do servidor. */
export type UpsertPunchResult = "applied" | "stale" | "duplicate_minute" | "failed";

/** Acesso às batidas: Supabase no app, versão em memória nos testes. */
export type Punches = {
  /** Batidas não excluídas do dia local, em qualquer ordem. */
  onDate: (date: LocalDate) => Promise<Punch[]>;
  upsert: (write: PunchWrite) => Promise<UpsertPunchResult>;
};

export const PunchesContext = createContext<Punches | null>(null);

function usePunches(): Punches {
  const punches = useContext(PunchesContext);
  if (!punches) throw new Error("usePunches precisa de um PunchesContext.Provider");
  return punches;
}

const punchesKey = (userId: string) => ["punches", userId];

/** Batidas do usuário da sessão no dia local `date`. */
export function usePunchesOn(date: LocalDate) {
  const punches = usePunches();
  const user = useSignedInUser();
  return useQuery({
    queryKey: [...punchesKey(user.id), date],
    queryFn: () => punches.onDate(date),
  });
}

/** Grava a batida e, se o servidor mudou algo, só retorna depois de recarregar as batidas. */
export function useWritePunch() {
  const punches = usePunches();
  const user = useSignedInUser();
  const queryClient = useQueryClient();
  return async (write: PunchWrite): Promise<UpsertPunchResult> => {
    const result = await punches.upsert(write);
    // `stale`: outro aparelho gravou uma versão mais nova; recarrega para mostrá-la.
    if (result === "applied" || result === "stale") {
      await queryClient.invalidateQueries({ queryKey: punchesKey(user.id) });
    }
    return result;
  };
}
