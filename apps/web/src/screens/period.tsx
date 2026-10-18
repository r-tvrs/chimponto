import { ComingSoon } from "@/components/coming-soon";
import { ScreenHeader } from "@/components/screen-header";

export function PeriodScreen() {
  return (
    <>
      <ScreenHeader title="Período" />
      <ComingSoon
        humor="contando"
        title="O período vem aí"
        text="Saldo do período, horas extras, débito e a lista de dias chegam na próxima versão."
      />
    </>
  );
}
