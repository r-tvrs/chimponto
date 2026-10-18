import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/auth";

// Enquanto a sessão carrega não redireciona: o link mágico ainda pode estar na URL.

export function RequireSession({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === "loading") return null;
  if (state.status === "signed_out") return <Navigate to="/login" replace />;
  return children;
}

export function RequireNoSession({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  if (state.status === "loading") return null;
  if (state.status === "signed_in") return <Navigate to="/" replace />;
  return children;
}
