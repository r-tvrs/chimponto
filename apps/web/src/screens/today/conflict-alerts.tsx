import { type LocalDate, toLocalDate, toLocalTime } from "@chimponto/domain";
import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { OutboxItem } from "@/punches/outbox";
import { type Punch, punchOf } from "@/punches/punches";

/** "das 14:28" hoje; "de 15/10 às 14:28" em outro dia. */
function whenOf(punchedAt: Date, today: LocalDate): string {
  const time = toLocalTime(punchedAt);
  const date = toLocalDate(punchedAt);
  if (date === today) return `das ${time}`;
  const [, month, day] = date.split("-");
  return `de ${day}/${month} às ${time}`;
}

/**
 * Batidas da fila que o servidor recusou (docs/07). Com `duplicate_minute` (outro aparelho já tem
 * uma batida no minuto), o usuário muda a hora (sheet de edição) ou descarta; recusadas por outro
 * motivo (`rejected`) só podem ser descartadas.
 */
export function ConflictAlerts({
  conflicts,
  today,
  onChangeTime,
  onDiscard,
}: {
  conflicts: OutboxItem[];
  today: LocalDate;
  onChangeTime: (punch: Punch) => void;
  onDiscard: (item: OutboxItem) => void;
}) {
  return conflicts.map((item) => (
    <ConflictAlert
      key={item.seq}
      item={item}
      today={today}
      onChangeTime={onChangeTime}
      onDiscard={onDiscard}
    />
  ));
}

function ConflictAlert({
  item,
  today,
  onChangeTime,
  onDiscard,
}: {
  item: OutboxItem;
  today: LocalDate;
  onChangeTime: (punch: Punch) => void;
  onDiscard: (item: OutboxItem) => void;
}) {
  const titleId = useId();
  const punch = punchOf(item.write);
  const minuteTaken = item.conflict === "duplicate_minute";
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2.5 rounded-2xl bg-negative/12 px-3.5 py-3 text-negative"
    >
      <h2 id={titleId} className="sr-only">
        Batida não sincronizada
      </h2>
      <p className="flex items-center gap-2.5 text-[13px] leading-[1.4] font-bold">
        <TriangleAlert className="size-[18px] shrink-0" aria-hidden />
        <span>
          A batida {whenOf(punch.punchedAt, today)} não subiu:{" "}
          {minuteTaken ? "já tem uma nesse minuto em outro aparelho." : "o servidor recusou."}
        </span>
      </p>
      <div className="flex gap-2 pl-7">
        {minuteTaken && (
          <Button size="default" variant="outline" onClick={() => onChangeTime(punch)}>
            Mudar a hora
          </Button>
        )}
        <Button size="default" variant="ghost" onClick={() => onDiscard(item)}>
          Descartar
        </Button>
      </div>
    </section>
  );
}
