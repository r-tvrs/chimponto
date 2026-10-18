import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Bottom sheet do handoff (Radix Dialog): `bg-card`, topo r26, alça, título Fredoka 22 e fechar de
 * 44px. Entra com translateY em 320ms; o overlay faz fade de 250ms.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-250 data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[90dvh] max-w-[420px] flex-col gap-3.5 overflow-y-auto rounded-t-[26px] bg-card px-4 pt-2 pb-[max(18px,env(safe-area-inset-bottom))] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-320 data-[state=open]:ease-[cubic-bezier(.2,.8,.2,1)] data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <span aria-hidden className="mx-auto h-[5px] w-10 shrink-0 rounded-full bg-border" />
          <div className="flex items-center gap-2">
            <DialogPrimitive.Title className="flex-1 text-[22px] leading-none">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="flex size-11 items-center justify-center rounded-full bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
            >
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
