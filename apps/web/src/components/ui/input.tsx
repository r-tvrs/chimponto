import * as React from "react";
import { cn } from "@/lib/utils";

// 52px, r14, borda `input`; erro via aria-invalid (borda `negative`).
function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-[52px] w-full rounded-[14px] border border-input bg-card px-4 text-base font-semibold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-negative",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
