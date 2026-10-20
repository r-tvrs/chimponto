import { execSync } from "node:child_process";

const API_URL = process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321";

// Chave secreta do Supabase local: em CI vem do ambiente; local, de `supabase status`. Nunca no repositório.
function secretKey(): string {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  const status = JSON.parse(execSync("pnpm dlx supabase status -o json").toString()) as {
    SECRET_KEY: string;
  };
  return status.SECRET_KEY;
}

/** Cria a conta como o admin no painel: e-mail já confirmado, nenhum e-mail enviado. */
export async function createUserWithPassword(email: string, password: string): Promise<void> {
  const key = secretKey();
  const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`Falha ao criar ${email}: ${res.status} ${await res.text()}`);
}
