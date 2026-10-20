import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

/**
 * Câmera traseira dentro do app (#15): o `<input capture>` abre a câmera do sistema com a tela
 * preta no iOS instalado. As tracks desligam ao fechar, ao capturar (o sheet desmonta) e com o app
 * em segundo plano; voltam ao reabrir. A foto só existe como blob em memória (regra 2).
 */
export function CameraSheet({
  onPhoto,
  onDenied,
  onManual,
  onClose,
}: {
  onPhoto: (photo: Blob) => void;
  onDenied: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    let stream: MediaStream | undefined;
    // Sem `mediaDevices` (contexto inseguro) o TypeError também cai no manual.
    Promise.resolve()
      .then(() =>
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }),
      )
      .then(
        (s) => {
          stream = s;
          if (!active) return stopTracks(s);
          if (video.current) video.current.srcObject = s;
          setReady(true);
        },
        () => active && onDenied(),
      );
    return () => {
      active = false;
      if (stream) stopTracks(stream);
      setReady(false);
    };
    // Reabre só quando o app volta do segundo plano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const capture = () => {
    const v = video.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => (blob ? onPhoto(blob) : onDenied()), "image/jpeg", 0.92);
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()} title="Foto do comprovante">
      <div className="h-[320px] overflow-hidden rounded-[18px] border bg-black">
        <video ref={video} autoPlay playsInline muted className="size-full object-cover" />
      </div>
      <Button type="button" disabled={!ready} onClick={capture}>
        Capturar
      </Button>
      <Button type="button" variant="ghost" className="underline" onClick={onManual}>
        Registrar manualmente
      </Button>
    </Sheet>
  );
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}
