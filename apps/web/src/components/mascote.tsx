import { cn } from "@/lib/utils";

export type Humor =
  | "feliz"
  | "preocupado"
  | "tranquilo"
  | "almoco"
  | "saida"
  | "cofre"
  | "contando"
  | "pendente"
  | "offline"
  | "boasvindas"
  | "lupa"
  | "erro";

const ALT: Record<Humor, string> = {
  feliz: "Bolota comemorando com um cacho de bananas",
  preocupado: "Bolota preocupada, correndo atrasada",
  tranquilo: "Bolota tranquila fazendo joinha",
  almoco: "Bolota terminando de comer uma banana",
  saida: "Bolota pegando a mochila",
  cofre: "Bolota guardando um baú de bananas com cadeado",
  contando: "Bolota contando bananas",
  pendente: "Bolota coçando a cabeça",
  offline: "Bolota pendurada no cipó, sem sinal",
  boasvindas: "Bolota acenando",
  lupa: "Bolota lendo um comprovante com lupa",
  erro: "Bolota escorregando numa casca de banana",
};

/**
 * Mascote sempre sobre um círculo banana (separa a pelagem do fundo escuro).
 * A ilustração ocupa 86% da largura do círculo, alinhada embaixo, cortada pelo círculo.
 * Abaixo de 40px use /mascote/icone.svg (só o rosto).
 */
export function Mascote({
  humor,
  size = 84,
  decorativo = false,
  className,
}: {
  humor: Humor;
  size?: number;
  decorativo?: boolean;
  className?: string;
}) {
  const w = Math.round(size * 0.86);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-banana",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={`/mascote/${humor}.svg`}
        alt={decorativo ? "" : ALT[humor]}
        width={w}
        height={Math.round(w * 1.12)}
        draggable={false}
      />
    </span>
  );
}
