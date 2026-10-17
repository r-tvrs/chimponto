import { Fingerprint } from "lucide-react";
import { CachoBanana } from "@/components/cacho-banana";
import { Mascote } from "@/components/mascote";
import { Saldo } from "@/components/saldo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Tela provisória: valida tokens, fontes e componentes do handoff até a v1 existir.
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col gap-3 px-4 py-6">
      <h1 className="text-[28px] leading-none">Chimponto</h1>
      <div className="flex items-center gap-4 rounded-[20px] border bg-card p-4">
        <Mascote humor="boasvindas" size={84} />
        <div className="flex flex-col gap-1">
          <span className="text-[12.5px] font-semibold text-muted-foreground">
            Saldo do período
          </span>
          <Saldo min={80} className="text-[26px]" />
          <CachoBanana n={2} className="text-muted-foreground" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="positive">Hora extra</Badge>
        <Badge variant="negative">Falta</Badge>
        <Badge variant="warning">Almoço curto</Badge>
        <Badge variant="pending">Sem registro</Badge>
        <Badge variant="today">Hoje</Badge>
      </div>
      <Button size="ponto" className="mt-auto">
        <Fingerprint />
        Bater ponto
      </Button>
    </main>
  );
}
