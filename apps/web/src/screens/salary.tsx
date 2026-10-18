import { ComingSoon } from "@/components/coming-soon";
import { ScreenHeader } from "@/components/screen-header";

export function SalaryScreen() {
  return (
    <>
      <ScreenHeader title="Salário" />
      <ComingSoon
        humor="cofre"
        title="Seu salário vai morar num cofre"
        text="A estimativa do líquido do dia 1º chega numa próxima versão, com salário e descontos trancados por uma senha só sua."
      />
    </>
  );
}
