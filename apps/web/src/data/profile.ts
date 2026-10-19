import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const profileKey = (userId: string) => ["profile", userId];

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Grava o nome de exibição (vazio vira null: o avatar volta às iniciais do e-mail). */
export function useSaveDisplayName(userId: string) {
  const queryClient = useQueryClient();
  return async (displayName: string): Promise<"saved" | "failed"> => {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("user_id", userId);
    if (error) return "failed";
    await queryClient.invalidateQueries({ queryKey: profileKey(userId) });
    return "saved";
  };
}
