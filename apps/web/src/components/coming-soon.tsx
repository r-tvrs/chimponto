import { type Humor, Mascote } from "@/components/mascote";
import { Badge } from "@/components/ui/badge";

/** Card de aba que ainda não chegou nesta versão. */
export function ComingSoon({ humor, title, text }: { humor: Humor; title: string; text: string }) {
  return (
    <section className="flex flex-col items-center gap-2.5 rounded-[24px] border bg-card px-[18px] py-[22px] text-center">
      <Mascote humor={humor} size={132} decorativo />
      <Badge className="mt-1">Em breve</Badge>
      <h2 className="text-xl leading-[1.2]">{title}</h2>
      <p className="text-sm leading-normal font-medium text-pretty text-muted-foreground">{text}</p>
    </section>
  );
}
