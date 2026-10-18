import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/auth/auth";
import { useMembership } from "@/company/company";
import { ErrorState } from "@/components/error-state";

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

// As guardas de empresa ficam dentro de RequireSession: sem empresa → Empresa; com empresa → app.

function CompanyGate({ needsCompany, children }: { needsCompany: boolean; children: ReactNode }) {
  const membership = useMembership();
  if (membership.isPending) return null;
  if (membership.isError) {
    return (
      <ErrorState
        title="Não deu para abrir sua empresa"
        message="Confira a conexão e tente de novo."
        onRetry={() => void membership.refetch()}
      />
    );
  }
  const hasCompany = membership.data !== null;
  if (hasCompany !== needsCompany) return <Navigate to={hasCompany ? "/" : "/empresa"} replace />;
  return children;
}

export function RequireCompany({ children }: { children: ReactNode }) {
  return <CompanyGate needsCompany>{children}</CompanyGate>;
}

export function RequireNoCompany({ children }: { children: ReactNode }) {
  return <CompanyGate needsCompany={false}>{children}</CompanyGate>;
}
