import { ErrorState } from "@/components/error-state";

export function RouteError() {
  return (
    <ErrorState
      title="Algo deu errado"
      message="Escorregamos numa casca de banana ao abrir esta tela."
      onRetry={() => window.location.reload()}
    />
  );
}
