import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[transform,background-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Amarelo com borda inferior escura: dá contraste de objeto sobre fundo claro.
        default:
          "bg-primary text-primary-foreground font-extrabold shadow-[inset_0_-3px_0_color-mix(in_oklab,var(--primary)_70%,var(--foreground))]",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        outline: "border border-input bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-foreground underline underline-offset-[3px]",
        destructive: "bg-destructive text-destructive-foreground font-extrabold",
      },
      size: {
        default: "h-11 px-4 rounded-[14px] text-sm",            // 44px
        lg: "h-14 px-5 rounded-2xl text-base",                    // 56px — ação principal de formulário
        ponto: "h-[60px] w-full rounded-[18px] text-[17px] gap-3 [&_svg:not([class*='size-'])]:size-6", // "Bater ponto"
        icon: "size-11 rounded-full",                              // 44px
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
