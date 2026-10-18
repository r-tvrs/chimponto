import { initials } from "@/lib/initials";

/** Avatar de 40px com as iniciais do nome de exibição ou, sem ele, do e-mail. */
export function Avatar({ displayName, email }: { displayName: string | null; email: string }) {
  return (
    <span
      role="img"
      aria-label={displayName || email}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold"
    >
      {initials(displayName, email)}
    </span>
  );
}
