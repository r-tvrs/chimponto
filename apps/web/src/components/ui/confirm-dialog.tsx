import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Confirmação de ação destrutiva (AlertDialog do handoff): card r24, padding 20, Cancelar (outline)
 * à esquerda e a ação (destructive) à direita, com 48px.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=open]:animate-in data-[state=open]:fade-in" />
        <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[388px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-card p-5 outline-none">
          <AlertDialogPrimitive.Title className="text-xl leading-tight">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm leading-normal font-medium text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <AlertDialogPrimitive.Cancel
              className={cn(buttonVariants({ variant: "outline" }), "h-12")}
            >
              Cancelar
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={cn(buttonVariants({ variant: "destructive" }), "h-12")}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
