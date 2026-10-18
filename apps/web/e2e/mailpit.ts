import { expect } from "@playwright/test";

// SMTP local do Supabase (Mailpit). Em CI vem de `supabase status`.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitSearch = { messages: { ID: string }[] };
type MailpitMessage = { HTML: string };

/**
 * Espera o e-mail do link mágico chegar para `email` e devolve a URL de verificação.
 * Apaga o e-mail lido: o próximo pedido para o mesmo endereço espera o link novo.
 */
export async function magicLinkFor(email: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${email}"`);
        const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
        id = ((await res.json()) as MailpitSearch).messages[0]?.ID;
        return id;
      },
      { message: `e-mail do link mágico para ${email}` },
    )
    .toBeTruthy();

  const message = (await (
    await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)
  ).json()) as MailpitMessage;
  await fetch(`${MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IDs: [id] }),
  });
  const href = /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(message.HTML)?.[1];
  if (!href) throw new Error(`Link mágico não encontrado no e-mail para ${email}`);
  return href.replaceAll("&amp;", "&");
}
