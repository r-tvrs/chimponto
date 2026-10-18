import { createContext, useContext } from "react";

export type User = { id: string; email: string };

export type AuthState =
  | { status: "loading" }
  /** `linkError`: o app abriu por um link mágico expirado ou já usado. */
  | { status: "signed_out"; linkError: boolean }
  | { status: "signed_in"; user: User };

export type MagicLinkResult = "sent" | "rate_limited" | "failed";

/** `failed`: o SDK acusou erro. A sessão pode ter saído mesmo assim; se saiu, a guarda leva ao Login. */
export type SignOutResult = "signed_out" | "failed";

export type Auth = {
  state: AuthState;
  requestMagicLink: (email: string) => Promise<MagicLinkResult>;
  signOut: () => Promise<SignOutResult>;
};

export const AuthContext = createContext<Auth | null>(null);

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth precisa de um AuthContext.Provider");
  return auth;
}

/** Usuário da sessão, para telas que só existem atrás da guarda de rotas. */
export function useSignedInUser(): User {
  const { state } = useAuth();
  if (state.status !== "signed_in") throw new Error("Tela exige sessão");
  return state.user;
}
