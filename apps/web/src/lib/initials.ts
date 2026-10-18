/**
 * Iniciais do avatar: primeira e última palavra do nome de exibição; sem nome, as partes
 * do e-mail antes do @ ("marina.costa" -> "MC"). Uma palavra só dá uma letra.
 */
export function initials(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email.split("@")[0] || "";
  const words = source.split(/[^\p{L}]+/u).filter(Boolean);
  const first = words[0];
  if (!first) return "";
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return (first[0]! + (last?.[0] ?? "")).toLocaleUpperCase("pt-BR");
}
