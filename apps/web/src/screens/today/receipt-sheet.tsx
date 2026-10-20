import type { LocalDate, LocalTime } from "@chimponto/domain";
import { useEffect, useState } from "react";
import { Mascote } from "@/components/mascote";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { parseReceipt } from "@/ocr/parse-receipt";
import { readReceipt } from "@/ocr/read-receipt";

export type ReceiptReading = { date: LocalDate; time: LocalTime };

/**
 * Sheet "Lendo comprovante" (handoff §3): mostra a foto e o progresso enquanto o OCR roda no
 * aparelho. Devolve a data e hora lidas, ou null se não deu para ler (docs/06). A foto só vive
 * num object URL, revogado ao fechar.
 */
export function ReceiptSheet({
  photo,
  onRead,
  onManual,
  onClose,
}: {
  photo: Blob;
  onRead: (reading: ReceiptReading | null) => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const [url] = useState(() => URL.createObjectURL(photo));
  const [progress, setProgress] = useState(0);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  useEffect(() => {
    let active = true;
    readReceipt(photo, (ratio) => active && setProgress(ratio))
      .then((text) => parseReceipt(text, new Date()))
      .catch(() => null)
      .then((reading) => active && onRead(reading));
    return () => {
      active = false;
    };
    // Uma leitura por foto; trocar a foto remonta o sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()} title="Lendo comprovante">
      <div className="relative h-[220px] overflow-hidden rounded-[18px] border">
        <img src={url} alt="Foto do comprovante" className="size-full object-cover" />
        <Mascote humor="lupa" size={96} className="absolute right-2 bottom-2" />
      </div>
      <p className="text-[15px] font-bold">Procurando data e hora…</p>
      <div
        role="progressbar"
        aria-label="Lendo comprovante"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-banana transition-[width]" style={{ width: `${progress * 100}%` }} />
      </div>
      <Button type="button" variant="ghost" className="underline" onClick={onManual}>
        Registrar manualmente
      </Button>
    </Sheet>
  );
}
