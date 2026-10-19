import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

/** Avatar de 40px (ou o tamanho de `className`) com as iniciais do nome de exibição ou do e-mail. */
export function Avatar({
  displayName,
  email,
  className,
}: {
  displayName: string | null;
  email: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={displayName || email}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold",
        className,
      )}
    >
      {initials(displayName, email)}
    </span>
  );
}
