import { CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Pill de sync do cabeçalho da Hoje (handoff, Estados globais): "Offline · N na fila" sem conexão,
 * "N na fila" com conexão. Some quando a fila zera.
 */
export function SyncPill({ online, queued }: { online: boolean; queued: number }) {
  if (queued === 0) return null;
  return (
    <Badge variant="pending" className="h-[30px] py-0 text-[11.5px]">
      <CloudOff aria-hidden />
      {online ? `${queued} na fila` : `Offline · ${queued} na fila`}
    </Badge>
  );
}
