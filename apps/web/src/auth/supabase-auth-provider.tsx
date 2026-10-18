import { isAuthImplicitGrantRedirectError, type Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { type Auth, AuthContext, type AuthState, type MagicLinkResult } from "./auth";

function stateFrom(session: Session | null, linkError: boolean): AuthState {
  return session
    ? { status: "signed_in", user: { id: session.user.id, email: session.user.email ?? "" } }
    : { status: "signed_out", linkError };
}

async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (!error) return "sent";
  return error.status === 429 ? "rate_limited" : "failed";
}

/** Sessão do Supabase Auth: persistida pelo SDK, sobrevive a reabrir o app. */
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    // initialize() lê o link mágico da URL (#access_token ou #error) e devolve o erro, se houver.
    void supabase.auth.initialize().then(async ({ error }) => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const linkError = isAuthImplicitGrantRedirectError(error);
      if (linkError) window.history.replaceState(null, "", window.location.pathname);
      setState(stateFrom(data.session, linkError));
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return; // tratado acima, junto com o erro do link
      if (event === "SIGNED_OUT") queryClient.clear();
      setState(stateFrom(session, false));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const auth = useMemo<Auth>(
    () => ({
      state,
      requestMagicLink,
      signOut: async () => {
        // "local": sai só deste aparelho. Sem conexão, o SDK devolve erro nos dois casos:
        // - token de acesso válido: apaga a sessão mesmo assim;
        // - token vencido: não consegue renová-lo, mantém a sessão e só tenta de novo após 60 s.
        const { error } = await supabase.auth.signOut({ scope: "local" });
        return error ? "failed" : "signed_out";
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
