import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Fundo tingido a 12% + texto na cor cheia: passa AA nos dois temas.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-[7px] text-xs font-bold leading-none tabular-nums whitespace-nowrap [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        positive: "bg-positive/12 text-positive",
        negative: "bg-negative/12 text-negative",
        warning: "bg-warning/12 text-warning",
        pending: "bg-pending/12 text-pending",
        neutral: "bg-muted text-muted-foreground",
        today: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
